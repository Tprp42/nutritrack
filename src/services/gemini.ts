import { Ingredient } from '../types/nutrition';

export interface GeminiNutritionResponse {
  repas_nom: string;
  ingredients: Array<{
    nom: string;
    poids_estime_g: number;
    calories: number;
    proteines_g: number;
    glucides_g: number;
    lipides_g: number;
    fibres_g?: number;
    sodium_mg?: number;
  }>;
  confiance?: 'haute' | 'moyenne' | 'faible';
}

const SYSTEM_PROMPT = `Tu es un nutritionniste et diététicien expert. 
Analyse avec précision le repas fourni (via photo ou description textuelle).
Décompose le plat en aliments/ingrédients individuels réalistes avec leur grammage estimé et leurs valeurs nutritionnelles complètes.

RÈGLES ABSOLUES ET IMPÉRATIVES :
1. Le tableau "ingredients" NE DOIT JAMAIS ÊTRE VIDE ! 
   Même si l'utilisateur donne un nom court comme "Petit Dej Oeuf", "Burger", "Pâtes carbo", tu DOIS OBLIGATOIREMENT décomposer le plat en ingrédients concrets (ex: Oeufs 120g, Pain 50g, Beurre 10g).
2. Pour chaque aliment, estime le poids en grammes (poids_estime_g > 0) et des calories réalistes (calories > 0).
3. Sois précis sur les macronutriments (calories, protéines en g, glucides en g, lipides en g).
4. Inclus également les micronutriments clés : fibres (fibres_g) et sodium (sodium_mg).
5. Fournis un indice de confiance : "haute", "moyenne" ou "faible".

Schéma JSON attendu :
{
  "repas_nom": "Nom court et explicite du plat (ex: Petit Déjeuner aux Oeufs)",
  "ingredients": [
    {
      "nom": "Oeufs brouillés",
      "poids_estime_g": 120,
      "calories": 180,
      "proteines_g": 14.5,
      "glucides_g": 1.2,
      "lipides_g": 13.0,
      "fibres_g": 0,
      "sodium_mg": 180
    }
  ],
  "confiance": "haute"
}`;

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    repas_nom: { type: "STRING" },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nom: { type: "STRING" },
          poids_estime_g: { type: "NUMBER" },
          calories: { type: "NUMBER" },
          proteines_g: { type: "NUMBER" },
          glucides_g: { type: "NUMBER" },
          lipides_g: { type: "NUMBER" },
          fibres_g: { type: "NUMBER" },
          sodium_mg: { type: "NUMBER" }
        },
        required: ["nom", "poids_estime_g", "calories", "proteines_g", "glucides_g", "lipides_g"]
      }
    },
    confiance: { type: "STRING", enum: ["haute", "moyenne", "faible"] }
  },
  required: ["repas_nom", "ingredients"]
};

/**
 * Nettoie et extrait le JSON valide depuis la réponse de Gemini
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  // Retirer les blocs markdown éventuels ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Normalise et assainit la réponse Gemini pour garantir qu'elle contient TOUJOURS
 * un repas_nom et des ingrédients valides (jamais 0 ingrédient ni 0 kcal)
 */
export function normalizeGeminiResponse(raw: any, fallbackName: string = "Mon Repas"): GeminiNutritionResponse {
  if (!raw || typeof raw !== 'object') {
    raw = {};
  }

  // 1. Détection du nom du plat
  let mealName = raw.repas_nom || raw.nom || raw.plat || raw.name || raw.titre || fallbackName;
  mealName = String(mealName).trim() || fallbackName;

  // 2. Détection de la liste des ingrédients sous tous ses alias possibles
  let rawList = raw.ingredients || raw.aliments || raw.items || raw.food_items || raw.elements || raw.composition;
  if (!Array.isArray(rawList)) {
    if (Array.isArray(raw)) {
      rawList = raw;
    } else {
      rawList = [];
    }
  }

  // 3. Normalisation de chaque ingrédient
  const normalizedIngredients: GeminiNutritionResponse['ingredients'] = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;

    const nom = String(item.nom || item.name || item.aliment || item.label || 'Aliment').trim();
    const poids = Math.max(10, Number(item.poids_estime_g || item.poids_g || item.poids || item.weight_g || item.weight || item.grammes || 100));
    let cals = Number(item.calories || item.cal || item.kcal || item.energie || 0);
    let prot = Number(item.proteines_g || item.proteines || item.proteins || item.protein_g || 0);
    let carbs = Number(item.glucides_g || item.glucides || item.carbs || item.carbohydrates || 0);
    let fats = Number(item.lipides_g || item.lipides || item.fats || item.fat || 0);
    const fibres = Number(item.fibres_g || item.fibres || item.fiber || 0);
    const sodium = Number(item.sodium_mg || item.sodium || item.sel_mg || 0);

    // Si les calories étaient 0 mais les macros sont présentes, calcul Atwater
    if (cals <= 0 && (prot > 0 || carbs > 0 || fats > 0)) {
      cals = Math.round(prot * 4 + carbs * 4 + fats * 9);
    } else if (cals <= 0) {
      cals = Math.round(poids * 1.5); // estimation par défaut 150 kcal/100g
      prot = Number((poids * 0.1).toFixed(1));
      carbs = Number((poids * 0.15).toFixed(1));
      fats = Number((poids * 0.05).toFixed(1));
    }

    normalizedIngredients.push({
      nom,
      poids_estime_g: Math.round(poids),
      calories: Math.round(cals),
      proteines_g: Number(prot.toFixed(1)),
      glucides_g: Number(carbs.toFixed(1)),
      lipides_g: Number(fats.toFixed(1)),
      fibres_g: Number(fibres.toFixed(1)),
      sodium_mg: Math.round(sodium)
    });
  }

  // 4. Filet de sécurité absolu : Si la liste est vide, générer des ingrédients pertinents
  if (normalizedIngredients.length === 0) {
    const lower = mealName.toLowerCase();
    if (lower.includes('oeuf') || lower.includes('egg') || lower.includes('omelette')) {
      normalizedIngredients.push(
        {
          nom: "Oeufs entiers (2 pièces)",
          poids_estime_g: 120,
          calories: 180,
          proteines_g: 15.0,
          glucides_g: 0.8,
          lipides_g: 13.0,
          fibres_g: 0,
          sodium_mg: 160
        },
        {
          nom: "Pain grillé ou accompagnement",
          poids_estime_g: 50,
          calories: 130,
          proteines_g: 4.5,
          glucides_g: 24.0,
          lipides_g: 1.5,
          fibres_g: 3.0,
          sodium_mg: 200
        }
      );
    } else {
      normalizedIngredients.push({
        nom: mealName,
        poids_estime_g: 250,
        calories: 380,
        proteines_g: 22.0,
        glucides_g: 38.0,
        lipides_g: 14.0,
        fibres_g: 4.0,
        sodium_mg: 350
      });
    }
  }

  return {
    repas_nom: mealName,
    ingredients: normalizedIngredients,
    confiance: ['haute', 'moyenne', 'faible'].includes(raw.confiance) ? raw.confiance : 'haute'
  };
}

/**
 * Calcule les ratios nutritionnels de référence pour 100g
 * pour permettre des ajustements proportionnels instantanés
 */
export function enrichIngredientWithBase100g(raw: {
  nom: string;
  poids_estime_g: number;
  calories: number;
  proteines_g: number;
  glucides_g: number;
  lipides_g: number;
  fibres_g?: number;
  sodium_mg?: number;
}): Ingredient {
  const weight = Math.max(raw.poids_estime_g || 100, 1);
  const factor = 100 / weight;

  return {
    id: 'ing_' + Math.random().toString(36).substring(2, 9),
    nom: raw.nom || 'Aliment',
    poids_estime_g: Math.round(weight),
    calories: Math.round(raw.calories || 0),
    proteines_g: Number((raw.proteines_g || 0).toFixed(1)),
    glucides_g: Number((raw.glucides_g || 0).toFixed(1)),
    lipides_g: Number((raw.lipides_g || 0).toFixed(1)),
    fibres_g: Number((raw.fibres_g || 0).toFixed(1)),
    sodium_mg: Math.round(raw.sodium_mg || 0),
    basePer100g: {
      calories: Math.round(raw.calories * factor),
      proteines_g: Number((raw.proteines_g * factor).toFixed(2)),
      glucides_g: Number((raw.glucides_g * factor).toFixed(2)),
      lipides_g: Number((raw.lipides_g * factor).toFixed(2)),
      fibres_g: Number(((raw.fibres_g || 0) * factor).toFixed(2)),
      sodium_mg: Math.round((raw.sodium_mg || 0) * factor),
    }
  };
}

/**
 * Met à jour dynamiquement un ingrédient lorsqu'on ajuste son grammage
 */
export function recalculateIngredientForWeight(ingredient: Ingredient, newWeightG: number): Ingredient {
  const safeWeight = Math.max(newWeightG, 0);
  const base = ingredient.basePer100g || {
    calories: ingredient.poids_estime_g > 0 ? (ingredient.calories / ingredient.poids_estime_g) * 100 : 0,
    proteines_g: ingredient.poids_estime_g > 0 ? (ingredient.proteines_g / ingredient.poids_estime_g) * 100 : 0,
    glucides_g: ingredient.poids_estime_g > 0 ? (ingredient.glucides_g / ingredient.poids_estime_g) * 100 : 0,
    lipides_g: ingredient.poids_estime_g > 0 ? (ingredient.lipides_g / ingredient.poids_estime_g) * 100 : 0,
    fibres_g: ingredient.poids_estime_g > 0 ? ((ingredient.fibres_g || 0) / ingredient.poids_estime_g) * 100 : 0,
    sodium_mg: ingredient.poids_estime_g > 0 ? ((ingredient.sodium_mg || 0) / ingredient.poids_estime_g) * 100 : 0,
  };

  const ratio = safeWeight / 100;

  return {
    ...ingredient,
    poids_estime_g: Math.round(safeWeight),
    calories: Math.round(base.calories * ratio),
    proteines_g: Number((base.proteines_g * ratio).toFixed(1)),
    glucides_g: Number((base.glucides_g * ratio).toFixed(1)),
    lipides_g: Number((base.lipides_g * ratio).toFixed(1)),
    fibres_g: Number((base.fibres_g * ratio).toFixed(1)),
    sodium_mg: Math.round(base.sodium_mg * ratio),
    basePer100g: base,
  };
}

/**
 * Analyse un repas textuel via Gemini
 */
export async function analyzeMealText(
  text: string,
  apiKey: string,
  model: string = 'gemini-3.6-flash'
): Promise<GeminiNutritionResponse> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("Clé d'API Gemini non renseignée. Veuillez configurer votre clé dans les Réglages.");
  }

  const activeModel = model === 'gemini-2.5-flash' ? 'gemini-3.6-flash' : model;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          { text: `Description du repas : "${text}"` }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: "application/json",
      response_schema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.2
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.error?.message || `Erreur API Gemini (${response.status}: ${response.statusText})`;
    throw new Error(message);
  }

  const result = await response.json();
  const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error("Aucune réponse exploitable reçue du modèle Gemini.");
  }

  const cleanJson = cleanJsonString(textOutput);
  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    throw new Error("Format JSON non valide reçu de l'IA.");
  }

  return normalizeGeminiResponse(parsed, text);
}

/**
 * Analyse une photo de repas compressée via Gemini multimodal
 */
export async function analyzeMealPhoto(
  base64Data: string,
  mimeType: string,
  apiKey: string,
  model: string = 'gemini-3.6-flash',
  additionalNotes?: string
): Promise<GeminiNutritionResponse> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("Clé d'API Gemini non renseignée. Veuillez configurer votre clé dans les Réglages.");
  }

  const activeModel = model === 'gemini-2.5-flash' ? 'gemini-3.6-flash' : model;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey.trim()}`;

  const promptText = additionalNotes 
    ? `${SYSTEM_PROMPT}\n\nPrécisions de l'utilisateur sur la photo : "${additionalNotes}"`
    : `${SYSTEM_PROMPT}\n\nAnalyse attentivement cette photo de repas, identifie tous les composants visibles et estime leurs portions.`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: base64Data
            }
          },
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: "application/json",
      response_schema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.2
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.error?.message || `Erreur API Gemini (${response.status}: ${response.statusText})`;
    throw new Error(message);
  }

  const result = await response.json();
  const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error("Aucune réponse exploitable reçue du modèle Gemini.");
  }

  const cleanJson = cleanJsonString(textOutput);
  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    throw new Error("Format JSON non valide reçu de l'IA.");
  }

  return normalizeGeminiResponse(parsed, additionalNotes || "Repas Photo");
}

/**
 * Repas de démonstration pour tester l'application sans clé API
 */
export function getMockMealDemo(): GeminiNutritionResponse {
  return {
    repas_nom: "Bowl Poulet Rôti, Quinoa & Avocat",
    ingredients: [
      {
        nom: "Filet de poulet grillé",
        poids_estime_g: 150,
        calories: 247,
        proteines_g: 46.5,
        glucides_g: 0,
        lipides_g: 5.4,
        fibres_g: 0,
        sodium_mg: 110
      },
      {
        nom: "Quinoa cuit",
        poids_estime_g: 160,
        calories: 192,
        proteines_g: 7.0,
        glucides_g: 34.1,
        lipides_g: 3.1,
        fibres_g: 4.5,
        sodium_mg: 12
      },
      {
        nom: "Avocat frais",
        poids_estime_g: 70,
        calories: 112,
        proteines_g: 1.4,
        glucides_g: 6.0,
        lipides_g: 10.3,
        fibres_g: 4.7,
        sodium_mg: 5
      },
      {
        nom: "Huile d'olive vierge",
        poids_estime_g: 10,
        calories: 88,
        proteines_g: 0,
        glucides_g: 0,
        lipides_g: 10.0,
        fibres_g: 0,
        sodium_mg: 0
      }
    ],
    confiance: "haute"
  };
}
