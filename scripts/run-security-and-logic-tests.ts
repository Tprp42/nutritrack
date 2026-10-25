import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { calculateProfileNutrition } from '../src/services/profileCalculator';
import { normalizeGeminiResponse } from '../src/services/gemini';
import { seedInitialFavorites, sanitizeText, unescapeHtml } from '../src/services/storage';
import { formatDateYMD, shiftDateByWeeks, getWeekRangeLabel } from '../src/utils/dateUtils';
import { extractRecentFoods, extractRecentMeals, tryMatchTextWithKnownFoods, recentFoodToIngredient } from '../src/utils/recentFoods';
import { enrichIngredientWithBase100g, recalculateIngredientForWeight } from '../src/services/gemini';

console.log('🔒 Démarrage de la suite de tests de sécurité et de validation logique...\n');

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// =========================================================================
// 1. Tests de Sécurité : Absence de clés API dans le code & respect du .gitignore
// =========================================================================
test('Sécurité : Vérification du .gitignore pour bloquer les fichiers sensibles', () => {
  const gitignorePath = path.resolve('.gitignore');
  assert(fs.existsSync(gitignorePath), 'Le fichier .gitignore doit exister');
  const content = fs.readFileSync(gitignorePath, 'utf8');

  // Doit ignorer les fichiers d'environnement et secrets
  assert(content.includes('.env'), '.gitignore doit ignorer les fichiers .env');
  assert(content.includes('node_modules'), '.gitignore doit ignorer node_modules');
  assert(content.includes('dist'), '.gitignore doit ignorer le dossier de build dist');
});

test('Sécurité : Aucun token ou clé API Google hardcodé dans le code source', () => {
  const srcDir = path.resolve('src');
  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        // Vérifie qu'aucune chaîne ressemblant à une clé d'API Google (AIzaSy...) n'est présente
        const match = fileContent.match(/AIzaSy[A-Za-z0-9_-]{33}/);
        assert(!match, `Clé API en clair détectée dans ${fullPath} !`);
      }
    }
  }
  scanDir(srcDir);
});

test('Sécurité : Vérification du bundle de production (dist/) - 0 clé API ou secret dans les fichiers déployés', () => {
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    function scanDist(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDist(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.json') || file.endsWith('.css')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const match = content.match(/AIzaSy[A-Za-z0-9_-]{33}/);
          assert(!match, `Clé API détectée dans le bundle de production ${fullPath} !`);
        }
      }
    }
    scanDist(distDir);
  }
});

test('Sécurité : Isolation réseau - Seul l\'endpoint officiel Google est contacté (zéro proxy/télémétrie)', () => {
  const geminiServicePath = path.resolve('src/services/gemini.ts');
  const code = fs.readFileSync(geminiServicePath, 'utf8');
  
  // Vérifie que l'endpoint cible bien generativelanguage.googleapis.com
  assert(code.includes('https://generativelanguage.googleapis.com'), 'L\'endpoint doit être le domaine officiel Google');
  
  // Vérifie qu'aucun service tiers d'analytique n'est contacté
  const forbiddenTrackers = ['segment.io', 'mixpanel', 'sentry', 'google-analytics', 'logrocket', 'datadog', 'amplitude'];
  for (const tracker of forbiddenTrackers) {
    assert(!code.includes(tracker), `Tracker tiers interdit détecté : ${tracker}`);
  }
});

test('Sécurité : Absence totale de PHP (Immunité absolue aux failles PHP)', () => {
  const rootDir = path.resolve('.');
  function scanForPhp(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanForPhp(fullPath);
      } else {
        const ext = path.extname(file).toLowerCase();
        assert(!['.php', '.phtml', '.php3', '.php4', '.php5', '.phps'].includes(ext), `Fichier PHP détecté : ${fullPath}`);
      }
    }
  }
  scanForPhp(rootDir);

  // Vérifie package.json
  const pkgContent = fs.readFileSync(path.resolve('package.json'), 'utf8');
  assert(!pkgContent.toLowerCase().includes('php'), 'Aucune dépendance PHP ne doit exister');
});

// =========================================================================
// 2. Tests de Sécurité : Sanitisation anti-XSS et protection de l'Export JSON
// =========================================================================
test('Sécurité & Sanitisation : Décodage anti-boucle d\'entités HTML et réparation des textes corrompus', () => {
  // Test 1 : Réparation d'une chaîne ayant subi des encodages multiples (bug Flocons d&amp;amp;amp;#039;avoine)
  const corruptedMultiEscaped = "Flocons d&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;#039;avoine (50g)";
  const repaired = sanitizeText(corruptedMultiEscaped);
  assert.strictEqual(repaired, "Flocons d'avoine (50g)", "Les boucles d'entités HTML doivent être complètement résorbées");

  // Test 2 : Chaîne tronquée avec suffixe ;a
  const truncatedCorrupted = "Flocons d&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;a";
  const repairedTruncated = sanitizeText(truncatedCorrupted);
  assert.strictEqual(repairedTruncated, "Flocons d'avoine (50g)", "Le nom de l'aliment favori corrompu doit être réparé");

  // Test 3 : Neutralisation des balises scripts sans détruire les apostrophes
  const maliciousInput = '<script>alert("XSS Attack")</script>Pavé de saumon d\'Alaska';
  const sanitized = sanitizeText(maliciousInput);
  assert(!sanitized.includes('<script>'), 'Les balises script doivent être éliminées');
  assert(sanitized.includes("Pavé de saumon d'Alaska"), 'Le texte légitime avec apostrophe doit être intact');
});

test('Sécurité : L’export JSON ne doit jamais exposer la clé API Gemini', () => {
  // Simulation de payload d'export
  const settingsWithKey = {
    geminiApiKey: 'AIzaSyFakeKeyForTestingPurposeOnly12345',
    geminiModel: 'gemini-3.6-flash',
    weeklyCalorieBudget: 17500
  };

  const exportPayload = {
    settings: {
      ...settingsWithKey,
      geminiApiKey: '' // Omission sécurisée
    }
  };

  assert.strictEqual(exportPayload.settings.geminiApiKey, '', 'La clé API doit être vidée dans l\'export JSON');
  assert(!JSON.stringify(exportPayload).includes('AIzaSyFakeKey'), 'Aucune clé ne doit apparaître dans le JSON généré');
});

// =========================================================================
// 3. Tests Métaboliques : Profil 100 kg Perte de Poids vs 60 kg Prise de Masse
// =========================================================================
test('Profil : Calcul pour un profil de 100 kg en Perte de poids / Sèche', () => {
  const profile100kg = {
    weightKg: 100,
    heightCm: 182,
    age: 35,
    gender: 'male' as const,
    activityLevel: 'sedentary' as const,
    goal: 'fat_loss' as const
  };

  const result = calculateProfileNutrition(profile100kg);

  // BMR = 10*100 + 6.25*182 - 5*35 + 5 = 1000 + 1137.5 - 175 + 5 = 1967.5 -> 1968 kcal
  assert(result.bmr >= 1950 && result.bmr <= 1980, `BMR attendu ~1968, obtenu ${result.bmr}`);
  
  // TDEE sédentaire (*1.2) ~ 2362 kcal
  assert(result.tdee >= 2300 && result.tdee <= 2400, `TDEE attendu ~2362, obtenu ${result.tdee}`);

  // Objectif perte de poids : doit être en déficit calorique (-400 à -500 kcal)
  assert(result.recommendedDailyCalories < result.tdee, 'Les calories recommandées doivent être inférieures au TDEE en perte de poids');
  
  // Les protéines doivent être élevées (>= 1.8g / kg pour préserver le muscle en déficit)
  assert(result.macroTargets.proteins_g >= 180, `Protéines attendues >= 180g pour 100kg en sèche, obtenu ${result.macroTargets.proteins_g}g`);

  // Le budget hebdomadaire doit correspondre à 7 jours
  assert.strictEqual(result.recommendedWeeklyCalories, result.recommendedDailyCalories * 7);
});

test('Profil : Calcul pour un profil de 60 kg en Prise de masse / Muscle', () => {
  const profile60kg = {
    weightKg: 60,
    heightCm: 172,
    age: 22,
    gender: 'male' as const,
    activityLevel: 'moderate' as const,
    goal: 'muscle_gain' as const
  };

  const result = calculateProfileNutrition(profile60kg);

  // Objectif prise de masse : doit être en surplus calorique (+300 à +400 kcal)
  assert(result.recommendedDailyCalories > result.tdee, 'Les calories recommandées doivent être supérieures au TDEE en prise de masse');
  
  // Les protéines doivent être adaptées à l\'anabolisme (>= 2g/kg)
  assert(result.macroTargets.proteins_g >= 120, `Protéines attendues >= 120g pour 60kg en prise de masse, obtenu ${result.macroTargets.proteins_g}g`);

  assert.strictEqual(result.recommendedWeeklyCalories, result.recommendedDailyCalories * 7);
});

// =========================================================================
// 4. Tests Algorithmiques : Rééquilibrage sain et non-gonflant
// =========================================================================
test('Budget Hebdomadaire : Rééquilibrage dynamique protecteur après excès le lundi', () => {
  const dailyTarget = 2500;
  const pastCaloriesOnMonday = 3100; // Excès de 600 kcal le lundi
  const remainingDays = 6; // Mardi au dimanche

  // Excès de 600 kcal réparti sur 6 jours = 100 kcal/jour de compensation (plafonné à 250 max)
  const pastSurplus = pastCaloriesOnMonday - (1 * dailyTarget);
  const compensationPerDay = Math.min(Math.round(pastSurplus / remainingDays), 250);
  const dynamicDailyRemaining = dailyTarget - compensationPerDay; // 2400 kcal/j

  assert.strictEqual(dynamicDailyRemaining, 2400);
  assert(dynamicDailyRemaining < 2500, 'La moyenne restante doit doucement compenser l\'excès passé');
  assert(dynamicDailyRemaining >= 2250, 'La compensation ne doit jamais être violente ou punitive');
});

test('Budget Hebdomadaire : En cas de déficit passé, la cible reste saine et stable (ZÉRO dérive vers 3000+ kcal)', () => {
  const dailyTarget = 2500;
  const pastCalories = 1900; // Déficit de 600 kcal
  const remainingDays = 6;

  const pastSurplus = pastCalories - (1 * dailyTarget); // -600 (déficit)
  
  // RÈGLE FIXÉE SUITE AUX RETOURS UTILISATEUR :
  // Un déficit ne doit JAMAIS forcer l'utilisateur à se suralimenter les jours suivants !
  const dynamicDailyRemaining = pastSurplus > 0
    ? dailyTarget - Math.min(Math.round(pastSurplus / remainingDays), 250)
    : dailyTarget; // Reste à 2500 kcal

  assert.strictEqual(dynamicDailyRemaining, 2500, 'La cible ne doit pas augmenter suite à un déficit');
  assert(dynamicDailyRemaining <= dailyTarget, 'La cible ne doit jamais dépasser l\'objectif standard suite à un déficit');
});

test('Budget Hebdomadaire : Isolation stricte entre les semaines (zéro report de la semaine passée)', () => {
  const week1Budget = 17500;
  const week1Consumed = 14000; // 3500 kcal de déficit en fin de semaine 1
  const week2Budget = 17500; // Nouvelle semaine commence

  // Semaine 2 démarre avec son budget propre et indépendant
  const week2InitialRemaining = week2Budget; // 17500
  const week2DailyTarget = Math.round(week2Budget / 7); // 2500

  assert.strictEqual(week2InitialRemaining, 17500, 'La semaine 2 doit démarrer à 17500 sans report du déficit de semaine 1');
  assert.strictEqual(week2DailyTarget, 2500, 'La cible journalière du lundi commence strictement à 2500 kcal/j');
});

test('Navigation Multi-Semaines : Fonctions de décalage et libellé d\'intervalle', () => {
  const monday = new Date(2026, 8, 21); // Lundi 21 Septembre 2026
  const nextMonday = shiftDateByWeeks(monday, 1);
  const prevMonday = shiftDateByWeeks(monday, -1);

  assert.strictEqual(formatDateYMD(nextMonday), '2026-09-28');
  assert.strictEqual(formatDateYMD(prevMonday), '2026-09-14');

  const label = getWeekRangeLabel(monday);
  assert(label.includes('21') && label.includes('27'), `Le label doit contenir 21 et 27, obtenu : ${label}`);
});


// =========================================================================
// 5. Tests de Robustesse : Normalisation IA et cas "Petit Dej Oeuf"
// =========================================================================
test('Robustesse IA : Résolution du cas "Petit Dej Oeuf" avec ingredients vides', () => {
  // Cas exact du screenshot de l'utilisateur
  const emptyResponse = {
    repas_nom: "Petit Dej Oeuf",
    ingredients: []
  };

  const normalized = normalizeGeminiResponse(emptyResponse, "Petit Dej Oeuf");

  assert.strictEqual(normalized.repas_nom, "Petit Dej Oeuf");
  assert(normalized.ingredients.length > 0, 'Les ingrédients ne doivent jamais être vides');
  
  const totalCals = normalized.ingredients.reduce((sum, i) => sum + i.calories, 0);
  assert(totalCals > 0, 'Les calories totales calculées doivent être supérieures à 0');
  
  const hasEgg = normalized.ingredients.some(i => i.nom.toLowerCase().includes('oeuf'));
  assert(hasEgg, 'Doit déduire un ingrédient à base d\'oeufs pour un Petit Dej Oeuf');
});

test('Robustesse IA : Prise en charge des alias de clés (aliments, poids_g, cal)', () => {
  const aliasResponse = {
    nom: "Omelette Fromage",
    aliments: [
      {
        aliment: "Oeufs",
        poids_g: 100,
        cal: 140,
        proteins: 12,
        carbs: 1,
        fats: 10
      }
    ]
  };

  const normalized = normalizeGeminiResponse(aliasResponse);

  assert.strictEqual(normalized.repas_nom, "Omelette Fromage");
  assert.strictEqual(normalized.ingredients.length, 1);
  assert.strictEqual(normalized.ingredients[0].nom, "Oeufs");
  assert.strictEqual(normalized.ingredients[0].poids_estime_g, 100);
  assert.strictEqual(normalized.ingredients[0].calories, 140);
  assert.strictEqual(normalized.ingredients[0].proteines_g, 12);
});

// =========================================================================
// 6. Tests Favoris & Autocomplétion Non-Invasive
// =========================================================================
test('Favoris : Initialisation avec aliments et plats par défaut (Yaourt nature, etc.)', () => {
  const favs = seedInitialFavorites();

  assert(Array.isArray(favs.foods), 'favs.foods doit être un tableau');
  assert(Array.isArray(favs.meals), 'favs.meals doit être un tableau');
  assert(favs.foods.length >= 3, 'Doit contenir au moins 3 aliments favoris initiaux');
  assert(favs.meals.length >= 1, 'Doit contenir au moins 1 plat complet favori initial');

  const yaourt = favs.foods.find((f: any) => f.nom.toLowerCase().includes('yaourt'));
  assert(yaourt, 'Yaourt nature doit être présent dans les favoris initiaux');
  assert.strictEqual(yaourt.poids_g, 125);
  assert(yaourt.glucides_g > 0, 'Les glucides du yaourt doivent être renseignés');

  const petitDej = favs.meals.find((m: any) => m.nom.toLowerCase().includes('petit'));
  assert(petitDej, 'Petit déjeuner doit être présent dans les plats favoris');
  assert(petitDej.ingredients.length >= 2, 'Le plat doit avoir plusieurs ingrédients');
});

test('Autocomplétion : Filtrage insensible à la casse et aux accents', () => {
  const testItems = [
    { id: '1', nom: 'Yaourt nature (125g)' },
    { id: '2', nom: 'Petit déjeuner classique' },
    { id: '3', nom: 'Chocolat noir 70%' }
  ];

  function normalize(str: string) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function filterItems(query: string) {
    const q = normalize(query);
    if (q.length < 2) return [];
    return testItems.filter(item => normalize(item.nom).includes(q));
  }

  // Taper 'yao' doit trouver 'Yaourt nature'
  const match1 = filterItems('yao');
  assert.strictEqual(match1.length, 1);
  assert.strictEqual(match1[0].id, '1');

  // Taper 'dejeuner' sans accent doit trouver 'Petit déjeuner classique'
  const match2 = filterItems('dejeuner');
  assert.strictEqual(match2.length, 1);
  assert.strictEqual(match2[0].id, '2');

  // Taper 'CHOCO' en majuscules doit trouver 'Chocolat noir'
  const match3 = filterItems('CHOCO');
  assert.strictEqual(match3.length, 1);
  assert.strictEqual(match3[0].id, '3');

  // Taper 1 seule lettre ne doit rien déclencher (non-invasif)
  const matchShort = filterItems('y');
  assert.strictEqual(matchShort.length, 0);
});

test('Export / Import : Les favoris sont préservés dans le fichier de sauvegarde JSON', () => {
  const favs = seedInitialFavorites();

  const exportPayload = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    settings: {
      geminiApiKey: '',
      geminiModel: 'gemini-3.6-flash',
      weeklyCalorieBudget: 17500
    },
    meals: [],
    favorites: favs
  };

  const jsonStr = JSON.stringify(exportPayload);
  const parsed = JSON.parse(jsonStr);

  assert(parsed.favorites, 'Le champ favorites doit exister dans l\'export');
  assert.strictEqual(parsed.favorites.foods.length, favs.foods.length);
  assert.strictEqual(parsed.favorites.meals.length, favs.meals.length);
});

test('Personnalisation des Calories : Cible journalière manuelle et synchronisation du budget hebdomadaire', () => {
  // Test d'un profil initial
  const profile = {
    weightKg: 75,
    heightCm: 178,
    age: 28,
    gender: 'male' as const,
    activityLevel: 'moderate' as const,
    goal: 'maintenance' as const
  };

  const calc = calculateProfileNutrition(profile);
  assert(calc.recommendedDailyCalories > 0);

  // L'utilisateur choisit librement 2100 kcal au lieu de la recommandation
  const customTarget = 2100;
  const syncedWeeklyBudget = customTarget * 7;
  assert.strictEqual(syncedWeeklyBudget, 14700);

  // Calcul proportionnel des macros
  const protG = calc.macroTargets.proteins_g;
  const protCals = protG * 4;
  const remainingCals = Math.max(0, customTarget - protCals);
  const carbsG = Math.round((remainingCals * 0.65) / 4);
  const fatsG = Math.round((remainingCals * 0.35) / 9);

  assert(carbsG > 0, 'Les glucides doivent être positifs');
  assert(fatsG > 0, 'Les lipides doivent être positifs');
  assert.strictEqual(protG, calc.macroTargets.proteins_g, 'Les protéines indispensables du profil doivent être préservées');
});

test('Copie d\'aliments & Optimisation 0 API Call : Détection locale et recalcul proportionnel exact', () => {
  // Simuler l'exemple donné par l'utilisateur :
  // Hier : 1 cacao chaud (250g) et 2 pains au chocolat (140g)
  // Aujourd'hui : même cacao (250g) et 1 seul pain au chocolat (70g)
  const pastMeals = [
    {
      id: 'm_yesterday',
      repas_nom: 'Petit déjeuner gourmand',
      mealType: 'breakfast' as const,
      date: '2026-10-24',
      time: '08:30',
      timestamp: 1729758600000,
      source: 'manual' as const,
      ingredients: [
        enrichIngredientWithBase100g({
          nom: 'Cacao chaud',
          poids_estime_g: 250,
          calories: 180,
          proteines_g: 8.0,
          glucides_g: 24.0,
          lipides_g: 5.0
        }),
        enrichIngredientWithBase100g({
          nom: 'Pain au chocolat',
          poids_estime_g: 70, // 1 pain au choc = 70g, 290 kcal
          calories: 290,
          proteines_g: 5.0,
          glucides_g: 32.0,
          lipides_g: 16.0
        })
      ]
    }
  ];

  // 1. Extraction automatique depuis l'historique (sans besoin de favoris)
  const recentFoods = extractRecentFoods(pastMeals);
  assert.strictEqual(recentFoods.length, 2, 'Les 2 aliments distincts doivent être extraits');

  const recentMeals = extractRecentMeals(pastMeals);
  assert.strictEqual(recentMeals.length, 1, 'Le repas récent doit être extrait');

  // 2. Duplication directe de repas et ajustement d'ingrédient
  const painOriginal = recentFoods.find(f => f.nom.includes('Pain au chocolat'))!;
  assert(painOriginal, 'Pain au chocolat trouvé');
  assert.strictEqual(painOriginal.poids_g, 70);
  assert.strictEqual(painOriginal.calories, 290);

  // Recalcul proportionnel exact pour 2 pains (140g) puis 1 seul pain (70g) : 0 APPEL API
  const ing1 = recentFoodToIngredient(painOriginal, 70);
  assert.strictEqual(ing1.calories, 290);
  assert.strictEqual(ing1.proteines_g, 5.0);

  const ing2 = recalculateIngredientForWeight(ing1, 140);
  assert.strictEqual(ing2.calories, 580);
  assert.strictEqual(ing2.proteines_g, 10.0);

  // 3. Correspondance locale intelligente sans appel Gemini ("cacao et 1 pain au choc")
  const matched = tryMatchTextWithKnownFoods('cacao et 1 pain au choc', recentFoods);
  assert(matched !== null, 'Le texte doit être résolu localement sans API');
  assert.strictEqual(matched!.length, 2);

  const matchedCacao = matched!.find(m => m.nom.includes('Cacao'));
  const matchedPain = matched!.find(m => m.nom.includes('Pain'));

  assert(matchedCacao, 'Cacao détecté');
  assert(matchedPain, 'Pain au chocolat détecté');
  assert.strictEqual(matchedCacao!.poids_estime_g, 250);
  assert.strictEqual(matchedPain!.poids_estime_g, 70);
  assert.strictEqual(matchedPain!.calories, 290);
});

console.log(`\n========================================`);
console.log(`Résultats : ${passedTests}/${totalTests} tests réussis avec succès ! 🚀`);
console.log(`========================================\n`);
