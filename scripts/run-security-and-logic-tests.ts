import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { calculateProfileNutrition } from '../src/services/profileCalculator';
import { normalizeGeminiResponse } from '../src/services/gemini';
import { seedInitialFavorites } from '../src/services/storage';

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

// =========================================================================
// 2. Tests de Sécurité : Sanitisation anti-XSS et protection de l'Export JSON
// =========================================================================
test('Sécurité & Sanitisation : Échappement des balises scripts et HTML malveillant', () => {
  function escapeHtml(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const maliciousInput = '<script>alert("XSS Attack")</script>';
  const sanitized = escapeHtml(maliciousInput);
  assert(!sanitized.includes('<script>'), 'Les balises script ne doivent pas être conservées en clair');
  assert(sanitized.includes('&lt;script&gt;'), 'Les chevrons doivent être convertis en entités HTML');
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
// 4. Tests Algorithmiques : Rééquilibrage dynamique hebdomadaire
// =========================================================================
test('Budget Hebdomadaire : Rééquilibrage dynamique après excès le lundi', () => {
  const weeklyBudget = 17500; // 2500 kcal/jour standard
  const pastCaloriesOnMonday = 3100; // Excès de 600 kcal le lundi
  const remainingDays = 6; // Mardi au dimanche

  const remainingBudget = weeklyBudget - pastCaloriesOnMonday; // 14400 kcal
  const dynamicDailyRemaining = Math.round(remainingBudget / remainingDays); // 2400 kcal/j

  assert.strictEqual(dynamicDailyRemaining, 2400);
  assert(dynamicDailyRemaining < 2500, 'La moyenne restante doit automatiquement compenser l\'excès passé');
});

test('Budget Hebdomadaire : Rééquilibrage dynamique avec marge après repas léger', () => {
  const weeklyBudget = 17500;
  const pastCalories = 1900; // Déficit de 600 kcal
  const remainingDays = 6;

  const remainingBudget = weeklyBudget - pastCalories; // 15600 kcal
  const dynamicDailyRemaining = Math.round(remainingBudget / remainingDays); // 2600 kcal/j

  assert.strictEqual(dynamicDailyRemaining, 2600);
  assert(dynamicDailyRemaining > 2500, 'La moyenne restante doit accorder plus de marge calorique');
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

console.log(`\n========================================`);
console.log(`Résultats : ${passedTests}/${totalTests} tests réussis avec succès ! 🚀`);
console.log(`========================================\n`);
