import { Meal, Ingredient } from '../types/nutrition';
import { enrichIngredientWithBase100g, recalculateIngredientForWeight } from '../services/gemini';

export interface RecentFoodItem {
  id: string;
  nom: string;
  poids_g: number;
  calories: number;
  proteines_g: number;
  glucides_g: number;
  lipides_g: number;
  fibres_g?: number;
  sodium_mg?: number;
  basePer100g?: {
    calories: number;
    proteines_g: number;
    glucides_g: number;
    lipides_g: number;
    fibres_g: number;
    sodium_mg: number;
  };
  lastSeenTimestamp: number;
  frequency: number;
}

export interface RecentMealItem {
  id: string;
  nom: string;
  mealType?: Meal['mealType'];
  ingredients: Ingredient[];
  totalCalories: number;
  lastSeenTimestamp: number;
  frequency: number;
}

/**
 * Normalise une chaîne de texte pour recherche et correspondance sans accent ni casse
 */
export function normalizeSearchText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrait les aliments récents et fréquents depuis l'historique complet des repas.
 * Trie par fraîcheur et récurrence.
 */
export function extractRecentFoods(meals: Meal[], maxCount = 25): RecentFoodItem[] {
  if (!meals || meals.length === 0) return [];

  const sortedMeals = [...meals].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const foodsMap = new Map<string, RecentFoodItem>();

  for (const meal of sortedMeals) {
    const mealTimestamp = meal.timestamp || Date.now();
    for (const ing of meal.ingredients || []) {
      if (!ing.nom || ing.poids_estime_g <= 0) continue;
      const key = normalizeSearchText(ing.nom);
      if (!key) continue;

      const enriched = ing.basePer100g ? ing : enrichIngredientWithBase100g(ing);

      const existing = foodsMap.get(key);
      if (existing) {
        existing.frequency += 1;
        if (mealTimestamp > existing.lastSeenTimestamp) {
          existing.lastSeenTimestamp = mealTimestamp;
        }
      } else {
        foodsMap.set(key, {
          id: `recent_food_${key}`,
          nom: ing.nom,
          poids_g: ing.poids_estime_g,
          calories: ing.calories,
          proteines_g: ing.proteines_g,
          glucides_g: ing.glucides_g,
          lipides_g: ing.lipides_g,
          fibres_g: ing.fibres_g,
          sodium_mg: ing.sodium_mg,
          basePer100g: enriched.basePer100g,
          lastSeenTimestamp: mealTimestamp,
          frequency: 1
        });
      }
    }
  }

  return Array.from(foodsMap.values())
    .sort((a, b) => b.lastSeenTimestamp - a.lastSeenTimestamp || b.frequency - a.frequency)
    .slice(0, maxCount);
}

/**
 * Extrait les repas récents uniques depuis l'historique
 */
export function extractRecentMeals(meals: Meal[], maxCount = 10): RecentMealItem[] {
  if (!meals || meals.length === 0) return [];

  const sortedMeals = [...meals].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const mealsMap = new Map<string, RecentMealItem>();

  for (const meal of sortedMeals) {
    if (!meal.repas_nom || !meal.ingredients || meal.ingredients.length === 0) continue;
    const key = normalizeSearchText(meal.repas_nom);
    if (!key) continue;

    const totalCals = meal.ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
    const existing = mealsMap.get(key);

    if (existing) {
      existing.frequency += 1;
      if ((meal.timestamp || 0) > existing.lastSeenTimestamp) {
        existing.lastSeenTimestamp = meal.timestamp || 0;
        existing.ingredients = meal.ingredients;
        existing.totalCalories = totalCals;
      }
    } else {
      mealsMap.set(key, {
        id: `recent_meal_${meal.id}`,
        nom: meal.repas_nom,
        mealType: meal.mealType,
        ingredients: meal.ingredients,
        totalCalories: totalCals,
        lastSeenTimestamp: meal.timestamp || 0,
        frequency: 1
      });
    }
  }

  return Array.from(mealsMap.values())
    .sort((a, b) => b.lastSeenTimestamp - a.lastSeenTimestamp || b.frequency - a.frequency)
    .slice(0, maxCount);
}

/**
 * Convertit un RecentFoodItem en Ingredient complet prêt à être utilisé
 */
export function recentFoodToIngredient(item: RecentFoodItem, customWeightG?: number): Ingredient {
  const targetWeight = customWeightG !== undefined ? customWeightG : item.poids_g;
  const baseIng = enrichIngredientWithBase100g({
    nom: item.nom,
    poids_estime_g: item.poids_g,
    calories: item.calories,
    proteines_g: item.proteines_g,
    glucides_g: item.glucides_g,
    lipides_g: item.lipides_g,
    fibres_g: item.fibres_g,
    sodium_mg: item.sodium_mg
  });

  if (targetWeight !== item.poids_g) {
    return recalculateIngredientForWeight(baseIng, targetWeight);
  }
  return baseIng;
}

/**
 * Nettoie une chaîne de mots pluriels fréquents pour comparer
 */
function singularize(str: string): string {
  return str
    .replace(/s\b/g, '')
    .replace(/x\b/g, '')
    .trim();
}

/**
 * Analyse heuristique locale pour tenter d'associer un texte libre
 * avec des aliments connus de l'utilisateur (favoris ou récents),
 * évitant ainsi un appel API Gemini tout en recalculant précisément les quantités.
 */
export function tryMatchTextWithKnownFoods(
  text: string,
  knownFoods: Array<{ nom: string; poids_g?: number; poids_estime_g?: number; calories: number; proteines_g: number; glucides_g: number; lipides_g: number; fibres_g?: number; sodium_mg?: number; basePer100g?: any }>
): Ingredient[] | null {
  if (!text || !text.trim() || !knownFoods || knownFoods.length === 0) return null;

  // Découper par virgule, retour chariot, ' et ', '+', 'avec'
  const rawParts = text
    .split(/[,;\n\+]|\s+(?:et|avec)\s+/i)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (rawParts.length === 0) return null;

  const matchedIngredients: Ingredient[] = [];

  for (const part of rawParts) {
    const normPart = normalizeSearchText(part);
    if (!normPart) continue;

    // Détecter grammage ou multiplicateur
    const gramMatch = normPart.match(/(\d+)\s*(?:g|gr|grammes?)\b/);
    const countMatch = normPart.match(/^(\d+)\s+/);

    let detectedGrams: number | null = null;
    let multiplier: number | null = null;

    if (gramMatch) {
      detectedGrams = parseInt(gramMatch[1], 10);
    } else if (countMatch) {
      multiplier = parseInt(countMatch[1], 10);
    }

    // Retirer les déterminants et chiffres
    let cleanedPart = normPart
      .replace(/(\d+)\s*(?:g|gr|grammes?)\b/g, '')
      .replace(/^(\d+)\s+/, '')
      .replace(/\b(?:de|d'|du|des|un|une|le|la|les|portion|filet|pincee)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedPart) continue;

    const singCleaned = singularize(cleanedPart);

    let bestMatch: any = null;
    let bestScore = 0;

    for (const food of knownFoods) {
      const normFood = normalizeSearchText(food.nom);
      const singFood = singularize(normFood);

      if (normFood === cleanedPart || singFood === singCleaned) {
        bestMatch = food;
        bestScore = 100;
        break;
      }

      // Vérifier l'inclusion de sous-chaîne ou de mots clés
      if (cleanedPart.includes(normFood) || normFood.includes(cleanedPart) ||
          singCleaned.includes(singFood) || singFood.includes(singCleaned)) {
        const score = Math.min(singFood.length, singCleaned.length) / Math.max(singFood.length, singCleaned.length);
        if (score > bestScore && score >= 0.35) {
          bestScore = score;
          bestMatch = food;
        }
      }
    }

    if (bestMatch && bestScore >= 0.35) {
      const originalWeight = bestMatch.poids_g || bestMatch.poids_estime_g || 100;
      let finalWeight = originalWeight;

      if (detectedGrams !== null && detectedGrams > 0) {
        finalWeight = detectedGrams;
      } else if (multiplier !== null && multiplier > 0) {
        finalWeight = originalWeight * multiplier;
      }

      const ing = enrichIngredientWithBase100g({
        nom: bestMatch.nom,
        poids_estime_g: originalWeight,
        calories: bestMatch.calories,
        proteines_g: bestMatch.proteines_g,
        glucides_g: bestMatch.glucides_g,
        lipides_g: bestMatch.lipides_g,
        fibres_g: bestMatch.fibres_g,
        sodium_mg: bestMatch.sodium_mg
      });

      matchedIngredients.push(recalculateIngredientForWeight(ing, finalWeight));
    }
  }

  // Au moins 1 aliment matché et couvrant la majorité des éléments saisis
  if (matchedIngredients.length > 0 && matchedIngredients.length >= Math.ceil(rawParts.length * 0.5)) {
    return matchedIngredients;
  }

  return null;
}
