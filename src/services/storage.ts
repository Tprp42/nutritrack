import { Meal, AppSettings, UserProfile, FavoritesData, FavoriteFood, FavoriteMeal } from '../types/nutrition';

const MEALS_STORAGE_KEY = 'nutritrack_meals_v1';
const SETTINGS_STORAGE_KEY = 'nutritrack_settings_v1';
const FAVORITES_STORAGE_KEY = 'nutritrack_favorites_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  geminiModel: 'gemini-3.6-flash',
  weeklyCalorieBudget: 17500, // 2500 kcal/jour en moyenne
  profile: {
    weightKg: 75,
    heightCm: 178,
    age: 28,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintenance'
  }
};

/**
 * Charge les repas depuis le localStorage avec validation de structure
 */
export function loadMeals(): Meal[] {
  try {
    const raw = localStorage.getItem(MEALS_STORAGE_KEY);
    if (!raw) return seedInitialDemoMeals();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Validation et assainissement élément par élément
    return parsed.filter((m): m is Meal => {
      return (
        m &&
        typeof m === 'object' &&
        typeof m.id === 'string' &&
        typeof m.repas_nom === 'string' &&
        Array.isArray(m.ingredients)
      );
    });
  } catch (err) {
    console.error("Erreur lors du chargement des repas:", err);
    return [];
  }
}

/**
 * Sauvegarde les repas dans le localStorage
 */
export function saveMeals(meals: Meal[]): void {
  try {
    localStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(meals));
  } catch (err) {
    console.error("Erreur lors de la sauvegarde des repas:", err);
  }
}

/**
 * Charge les paramètres de l'application
 */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    // Migration automatique si l'ancien modèle déprécié était sauvegardé
    let model = parsed.geminiModel;
    if (!model || model === 'gemini-2.5-flash') {
      model = 'gemini-3.6-flash';
    }

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      geminiModel: model,
      profile: {
        ...DEFAULT_SETTINGS.profile!,
        ...(parsed.profile || {})
      }
    };
  } catch (err) {
    console.error("Erreur lors du chargement des paramètres:", err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Sauvegarde les paramètres
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error("Erreur lors de la sauvegarde des paramètres:", err);
  }
}

/**
 * Charge les favoris (aliments & repas complets) depuis le localStorage
 */
export function loadFavorites(): FavoritesData {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return seedInitialFavorites();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return seedInitialFavorites();

    const foods: FavoriteFood[] = Array.isArray(parsed.foods)
      ? (parsed.foods.map(sanitizeFavoriteFood).filter(Boolean) as FavoriteFood[])
      : [];
    const meals: FavoriteMeal[] = Array.isArray(parsed.meals)
      ? (parsed.meals.map(sanitizeFavoriteMeal).filter(Boolean) as FavoriteMeal[])
      : [];

    return { foods, meals };
  } catch (err) {
    console.error("Erreur lors du chargement des favoris:", err);
    return seedInitialFavorites();
  }
}

/**
 * Sauvegarde les favoris dans le localStorage
 */
export function saveFavorites(favorites: FavoritesData): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error("Erreur lors de la sauvegarde des favoris:", err);
  }
}

/**
 * Exporte l'intégralité des données en fichier JSON téléchargeable
 */
export function exportDataAsJson(meals: Meal[], settings: AppSettings, favorites?: FavoritesData): void {
  const exportPayload = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    // On n'inclut pas la clé API dans l'export par précaution de sécurité
    settings: {
      ...settings,
      geminiApiKey: '' // Omission sécurisée pour éviter de partager sa clé
    },
    meals,
    favorites: favorites || loadFavorites()
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `nutritrack-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Valide et importe un fichier JSON de sauvegarde de façon sécurisée
 */
export async function importDataFromJson(file: File): Promise<{
  meals: Meal[];
  settings?: Partial<AppSettings>;
  favorites?: FavoritesData;
}> {
  // Limite de taille à 15 Mo pour prévenir les attaques par dépassement de mémoire
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Fichier trop volumineux. La taille maximale autorisée est de 15 Mo.");
  }

  const text = await file.text();
  let parsed: any;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Le fichier sélectionné n'est pas un JSON valide.");
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error("Format de sauvegarde non reconnu.");
  }

  const validMeals: Meal[] = [];
  const rawMeals = Array.isArray(parsed.meals) ? parsed.meals : [];

  for (const m of rawMeals) {
    if (
      m &&
      typeof m === 'object' &&
      typeof m.id === 'string' &&
      typeof m.repas_nom === 'string' &&
      Array.isArray(m.ingredients)
    ) {
      // Nettoyage et assainissement des champs textuels (anti-XSS)
      validMeals.push({
        id: String(m.id).substring(0, 64),
        repas_nom: escapeHtml(String(m.repas_nom).substring(0, 100)),
        mealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(m.mealType) ? m.mealType : 'lunch',
        date: String(m.date || '').substring(0, 10),
        time: String(m.time || '12:00').substring(0, 5),
        timestamp: Number(m.timestamp) || Date.now(),
        ingredients: Array.isArray(m.ingredients) ? m.ingredients.map(sanitizeIngredient) : [],
        confiance: ['haute', 'moyenne', 'faible'].includes(m.confiance) ? m.confiance : 'moyenne',
        source: ['photo', 'text', 'manual'].includes(m.source) ? m.source : 'manual',
        notes: m.notes ? escapeHtml(String(m.notes).substring(0, 300)) : undefined
      });
    }
  }

  let importedSettings: Partial<AppSettings> | undefined;
  if (parsed.settings && typeof parsed.settings === 'object') {
    importedSettings = {
      weeklyCalorieBudget: Number(parsed.settings.weeklyCalorieBudget) || 17500,
      geminiModel: typeof parsed.settings.geminiModel === 'string' && parsed.settings.geminiModel !== 'gemini-2.5-flash'
        ? parsed.settings.geminiModel 
        : 'gemini-3.6-flash',
      profile: parsed.settings.profile ? sanitizeProfile(parsed.settings.profile) : undefined
    };
  }

  let importedFavorites: FavoritesData | undefined;
  if (parsed.favorites && typeof parsed.favorites === 'object') {
    const foods = Array.isArray(parsed.favorites.foods)
      ? (parsed.favorites.foods.map(sanitizeFavoriteFood).filter(Boolean) as FavoriteFood[])
      : [];
    const meals = Array.isArray(parsed.favorites.meals)
      ? (parsed.favorites.meals.map(sanitizeFavoriteMeal).filter(Boolean) as FavoriteMeal[])
      : [];
    importedFavorites = { foods, meals };
    saveFavorites(importedFavorites);
  }

  return { meals: validMeals, settings: importedSettings, favorites: importedFavorites };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeIngredient(ing: any) {
  return {
    id: String(ing.id || Math.random().toString(36).substring(2, 9)),
    nom: escapeHtml(String(ing.nom || 'Aliment').substring(0, 80)),
    poids_estime_g: Math.max(0, Number(ing.poids_estime_g) || 0),
    calories: Math.max(0, Number(ing.calories) || 0),
    proteines_g: Math.max(0, Number(ing.proteines_g) || 0),
    glucides_g: Math.max(0, Number(ing.glucides_g) || 0),
    lipides_g: Math.max(0, Number(ing.lipides_g) || 0),
    fibres_g: Math.max(0, Number(ing.fibres_g) || 0),
    sodium_mg: Math.max(0, Number(ing.sodium_mg) || 0),
    basePer100g: ing.basePer100g ? {
      calories: Number(ing.basePer100g.calories) || 0,
      proteines_g: Number(ing.basePer100g.proteines_g) || 0,
      glucides_g: Number(ing.basePer100g.glucides_g) || 0,
      lipides_g: Number(ing.basePer100g.lipides_g) || 0,
      fibres_g: Number(ing.basePer100g.fibres_g) || 0,
      sodium_mg: Number(ing.basePer100g.sodium_mg) || 0,
    } : undefined
  };
}

function sanitizeProfile(p: any): UserProfile {
  return {
    weightKg: Math.max(30, Math.min(300, Number(p.weightKg) || 75)),
    heightCm: Math.max(100, Math.min(250, Number(p.heightCm) || 178)),
    age: Math.max(12, Math.min(120, Number(p.age) || 28)),
    gender: p.gender === 'female' ? 'female' : 'male',
    activityLevel: ['sedentary', 'light', 'moderate', 'very_active'].includes(p.activityLevel) ? p.activityLevel : 'moderate',
    goal: ['fat_loss', 'maintenance', 'muscle_gain'].includes(p.goal) ? p.goal : 'maintenance'
  };
}

function sanitizeFavoriteFood(food: any): FavoriteFood | null {
  if (!food || typeof food !== 'object' || !food.nom) return null;
  return {
    id: String(food.id || 'fav_food_' + Math.random().toString(36).substring(2, 9)),
    nom: escapeHtml(String(food.nom).substring(0, 80)),
    poids_g: Math.max(1, Number(food.poids_g) || 100),
    calories: Math.max(0, Number(food.calories) || 0),
    proteines_g: Math.max(0, Number(food.proteines_g) || 0),
    glucides_g: Math.max(0, Number(food.glucides_g) || 0),
    lipides_g: Math.max(0, Number(food.lipides_g) || 0),
    fibres_g: Math.max(0, Number(food.fibres_g) || 0),
    sodium_mg: Math.max(0, Number(food.sodium_mg) || 0),
    basePer100g: food.basePer100g ? {
      calories: Number(food.basePer100g.calories) || 0,
      proteines_g: Number(food.basePer100g.proteines_g) || 0,
      glucides_g: Number(food.basePer100g.glucides_g) || 0,
      lipides_g: Number(food.basePer100g.lipides_g) || 0,
      fibres_g: Number(food.basePer100g.fibres_g) || 0,
      sodium_mg: Number(food.basePer100g.sodium_mg) || 0,
    } : undefined,
    createdAt: Number(food.createdAt) || Date.now()
  };
}

function sanitizeFavoriteMeal(meal: any): FavoriteMeal | null {
  if (!meal || typeof meal !== 'object' || !meal.nom || !Array.isArray(meal.ingredients)) return null;
  return {
    id: String(meal.id || 'fav_meal_' + Math.random().toString(36).substring(2, 9)),
    nom: escapeHtml(String(meal.nom).substring(0, 100)),
    mealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(meal.mealType) ? meal.mealType : 'breakfast',
    totalCalories: Math.max(0, Number(meal.totalCalories) || 0),
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.map(sanitizeIngredient) : [],
    createdAt: Number(meal.createdAt) || Date.now()
  };
}

export function seedInitialFavorites(): FavoritesData {
  return {
    foods: [
      {
        id: 'fav_food_1',
        nom: 'Yaourt nature (125g)',
        poids_g: 125,
        calories: 65,
        proteines_g: 4.4,
        glucides_g: 5.6,
        lipides_g: 3.8,
        fibres_g: 0,
        sodium_mg: 55,
        basePer100g: { calories: 52, proteines_g: 3.5, glucides_g: 4.5, lipides_g: 3.0, fibres_g: 0, sodium_mg: 44 },
        createdAt: Date.now()
      },
      {
        id: 'fav_food_2',
        nom: "Flocons d'avoine (50g)",
        poids_g: 50,
        calories: 185,
        proteines_g: 6.5,
        glucides_g: 30.0,
        lipides_g: 3.5,
        fibres_g: 5.0,
        sodium_mg: 2,
        basePer100g: { calories: 370, proteines_g: 13.0, glucides_g: 60.0, lipides_g: 7.0, fibres_g: 10.0, sodium_mg: 4 },
        createdAt: Date.now()
      },
      {
        id: 'fav_food_3',
        nom: 'Chocolat noir 70% (20g)',
        poids_g: 20,
        calories: 115,
        proteines_g: 1.6,
        glucides_g: 9.2,
        lipides_g: 8.4,
        fibres_g: 2.1,
        sodium_mg: 4,
        basePer100g: { calories: 575, proteines_g: 8.0, glucides_g: 46.0, lipides_g: 42.0, fibres_g: 10.5, sodium_mg: 20 },
        createdAt: Date.now()
      }
    ],
    meals: [
      {
        id: 'fav_meal_1',
        nom: 'Petit déjeuner classique',
        mealType: 'breakfast',
        totalCalories: 370,
        createdAt: Date.now(),
        ingredients: [
          {
            id: 'fav_ing_1',
            nom: 'Oeufs entiers (2 pièces)',
            poids_estime_g: 120,
            calories: 172,
            proteines_g: 15.1,
            glucides_g: 0.8,
            lipides_g: 11.9,
            fibres_g: 0,
            sodium_mg: 168,
            basePer100g: { calories: 143, proteines_g: 12.6, glucides_g: 0.7, lipides_g: 9.9, fibres_g: 0, sodium_mg: 140 }
          },
          {
            id: 'fav_ing_2',
            nom: 'Pain complet grillé (2 tranches)',
            poids_estime_g: 60,
            calories: 155,
            proteines_g: 5.5,
            glucides_g: 27.5,
            lipides_g: 2.1,
            fibres_g: 4.2,
            sodium_mg: 240,
            basePer100g: { calories: 258, proteines_g: 9.2, glucides_g: 45.8, lipides_g: 3.5, fibres_g: 7.0, sodium_mg: 400 }
          }
        ]
      }
    ]
  };
}

/**
 * Fournit quelques repas de démarrage pour que l'interface ne soit pas vide dès le premier lancement
 */
function seedInitialDemoMeals(): Meal[] {
  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];
  const todayStr = formatYMD(today);

  return [
    {
      id: 'meal_demo_1',
      repas_nom: "Omelette aux fines herbes & Pain complet",
      mealType: "breakfast",
      date: todayStr,
      time: "08:15",
      timestamp: Date.now() - 3600 * 1000 * 4,
      source: "text",
      confiance: "haute",
      ingredients: [
        {
          id: "ing_1",
          nom: "Oeufs entiers (3 pièces)",
          poids_estime_g: 150,
          calories: 215,
          proteines_g: 18.9,
          glucides_g: 1.1,
          lipides_g: 14.8,
          fibres_g: 0,
          sodium_mg: 210,
          basePer100g: { calories: 143, proteines_g: 12.6, glucides_g: 0.7, lipides_g: 9.9, fibres_g: 0, sodium_mg: 140 }
        },
        {
          id: "ing_2",
          nom: "Pain complet grillé",
          poids_estime_g: 60,
          calories: 155,
          proteines_g: 5.5,
          glucides_g: 27.5,
          lipides_g: 2.1,
          fibres_g: 4.2,
          sodium_mg: 240,
          basePer100g: { calories: 258, proteines_g: 9.2, glucides_g: 45.8, lipides_g: 3.5, fibres_g: 7.0, sodium_mg: 400 }
        }
      ]
    },
    {
      id: 'meal_demo_2',
      repas_nom: "Bowl Saumon, Riz basmati & Brocolis",
      mealType: "lunch",
      date: todayStr,
      time: "12:45",
      timestamp: Date.now() - 3600 * 1000 * 2,
      source: "photo",
      confiance: "haute",
      ingredients: [
        {
          id: "ing_3",
          nom: "Pavé de saumon rôti",
          poids_estime_g: 140,
          calories: 290,
          proteines_g: 28.0,
          glucides_g: 0,
          lipides_g: 19.5,
          fibres_g: 0,
          sodium_mg: 85,
          basePer100g: { calories: 208, proteines_g: 20.0, glucides_g: 0, lipides_g: 13.9, fibres_g: 0, sodium_mg: 60 }
        },
        {
          id: "ing_4",
          nom: "Riz basmati cuit",
          poids_estime_g: 180,
          calories: 234,
          proteines_g: 4.8,
          glucides_g: 50.4,
          lipides_g: 0.7,
          fibres_g: 1.8,
          sodium_mg: 5,
          basePer100g: { calories: 130, proteines_g: 2.7, glucides_g: 28.0, lipides_g: 0.4, fibres_g: 1.0, sodium_mg: 3 }
        },
        {
          id: "ing_5",
          nom: "Brocolis vapeur",
          poids_estime_g: 120,
          calories: 42,
          proteines_g: 3.4,
          glucides_g: 8.4,
          lipides_g: 0.5,
          fibres_g: 3.1,
          sodium_mg: 38,
          basePer100g: { calories: 35, proteines_g: 2.8, glucides_g: 7.0, lipides_g: 0.4, fibres_g: 2.6, sodium_mg: 32 }
        }
      ]
    }
  ];
}
