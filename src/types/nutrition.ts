export interface Ingredient {
  id: string;
  nom: string;
  poids_estime_g: number;
  calories: number;
  proteines_g: number;
  glucides_g: number;
  lipides_g: number;
  fibres_g?: number;
  sodium_mg?: number;
  // Reference values per 100g to enable exact proportional scaling when weight changes
  basePer100g?: {
    calories: number;
    proteines_g: number;
    glucides_g: number;
    lipides_g: number;
    fibres_g: number;
    sodium_mg: number;
  };
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  repas_nom: string;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: number;
  ingredients: Ingredient[];
  confiance?: 'haute' | 'moyenne' | 'faible';
  source: 'photo' | 'text' | 'manual';
  notes?: string;
}

export interface FavoriteFood {
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
  createdAt: number;
}

export interface FavoriteMeal {
  id: string;
  nom: string;
  mealType?: MealType;
  ingredients: Ingredient[];
  totalCalories: number;
  createdAt: number;
}

export interface FavoritesData {
  meals: FavoriteMeal[];
  foods: FavoriteFood[];
}

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';
export type FitnessGoal = 'fat_loss' | 'maintenance' | 'muscle_gain';

export interface UserProfile {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
}

export interface MacroTarget {
  proteins_g: number;
  carbs_g: number;
  fats_g: number;
  fibres_g: number;
  sodium_mg: number;
}

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  weeklyCalorieBudget: number; // default: 17500
  profile?: UserProfile;
  customDailyTarget?: number;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  totalCalories: number;
  totalProteines: number;
  totalGlucides: number;
  totalLipides: number;
  totalFibres: number;
  totalSodium: number;
  targetCalories: number;
}

export interface WeekSummary {
  weekStartDate: string; // Monday YYYY-MM-DD
  weekEndDate: string;   // Sunday YYYY-MM-DD
  days: DaySummary[];
  weeklyBudget: number;
  consumedCalories: number;
  remainingCalories: number;
  elapsedDaysCount: number; // days in the week up to today
  remainingDaysCount: number; // today included or remaining days
  dailyRemainingBudget: number; // dynamic rebalanced daily calories
  avgDailyConsumed: number;
  totalProteines: number;
  totalGlucides: number;
  totalLipides: number;
  totalFibres: number;
  totalSodium: number;
}
