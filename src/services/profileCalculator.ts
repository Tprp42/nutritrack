import { UserProfile, MacroTarget } from '../types/nutrition';

export interface ProfileCalculationResult {
  bmr: number; // Métabolisme de base (kcal)
  tdee: number; // Dépense énergétique journalière totale (kcal)
  recommendedDailyCalories: number;
  recommendedWeeklyCalories: number;
  macroTargets: MacroTarget;
  explanation: string;
}

/**
 * Calcul métabolique Mifflin-St Jeor & calcul des objectifs de macronutriments
 */
export function calculateProfileNutrition(profile: UserProfile): ProfileCalculationResult {
  const { weightKg, heightCm, age, gender, activityLevel, goal } = profile;

  // 1. Calcul du BMR (Mifflin-St Jeor)
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  bmr = Math.round(bmr);

  // 2. Facteur d'activité physique
  let activityMultiplier = 1.2; // sédentaire
  if (activityLevel === 'light') activityMultiplier = 1.375;
  else if (activityLevel === 'moderate') activityMultiplier = 1.55;
  else if (activityLevel === 'very_active') activityMultiplier = 1.725;

  const tdee = Math.round(bmr * activityMultiplier);

  // 3. Ajustement selon l'objectif (Perte vs Maintien vs Prise de masse)
  let calorieAdjustment = 0;
  let targetProteinPerKg = 1.6;
  let explanation = '';

  if (goal === 'fat_loss') {
    // Déficit calorique modéré et durable (-20% ou ~450 kcal)
    calorieAdjustment = -Math.min(Math.round(tdee * 0.2), 500);
    // En déficit, les protéines doivent être plus élevées pour préserver le muscle
    targetProteinPerKg = 2.0;
    explanation = `Objectif Perte de poids / Sèche : Déficit calorique contrôlé de ${Math.abs(calorieAdjustment)} kcal/jour pour brûler les graisses sans altérer la masse musculaire.`;
  } else if (goal === 'muscle_gain') {
    // Léger surplus calorique (+15% ou ~350 kcal)
    calorieAdjustment = Math.min(Math.round(tdee * 0.15), 400);
    // Protéines élevées pour l'hypertrophie musculaire
    targetProteinPerKg = 2.1;
    explanation = `Objectif Prise de masse : Surplus calorique maîtrisé de +${calorieAdjustment} kcal/jour avec apport protéique élevé pour stimuler l'anabolisme sans prise de graisse excessive.`;
  } else {
    // Maintien
    calorieAdjustment = 0;
    targetProteinPerKg = 1.6;
    explanation = `Objectif Maintien : Équilibre énergétique à 100% de votre dépense journalière (${tdee} kcal/jour).`;
  }

  // Seuil de sécurité minimal (1200 kcal femmes, 1500 kcal hommes)
  const minSafeCalories = gender === 'female' ? 1250 : 1500;
  const recommendedDailyCalories = Math.max(tdee + calorieAdjustment, minSafeCalories);
  const recommendedWeeklyCalories = recommendedDailyCalories * 7;

  // 4. Calcul des macronutriments cibles (g)
  // Protéines : 4 kcal/g
  const targetProteinsG = Math.round(weightKg * targetProteinPerKg);
  const proteinCalories = targetProteinsG * 4;

  // Lipides : ~0.9g à 1g / kg pour l'équilibre hormonal (9 kcal/g)
  const targetFatsG = Math.round(weightKg * 0.9);
  const fatCalories = targetFatsG * 9;

  // Glucides : le reste des calories disponibles (4 kcal/g)
  const remainingCalories = Math.max(recommendedDailyCalories - proteinCalories - fatCalories, 300);
  const targetCarbsG = Math.round(remainingCalories / 4);

  // Fibres recommandées : 14g pour 1000 kcal (~25-35g)
  const targetFibresG = Math.round((recommendedDailyCalories / 1000) * 14);

  // Sodium recommandé max : 2300 mg/jour selon OMS
  const targetSodiumMg = 2300;

  return {
    bmr,
    tdee,
    recommendedDailyCalories,
    recommendedWeeklyCalories,
    macroTargets: {
      proteins_g: targetProteinsG,
      carbs_g: targetCarbsG,
      fats_g: targetFatsG,
      fibres_g: targetFibresG,
      sodium_mg: targetSodiumMg
    },
    explanation
  };
}
