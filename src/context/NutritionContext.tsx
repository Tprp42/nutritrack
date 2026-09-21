import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Meal, 
  AppSettings, 
  DaySummary, 
  WeekSummary, 
  MacroTarget,
  FavoritesData,
  FavoriteFood,
  FavoriteMeal
} from '../types/nutrition';
import { 
  loadMeals, 
  saveMeals, 
  loadSettings, 
  saveSettings,
  loadFavorites,
  saveFavorites,
  exportDataAsJson, 
  importDataFromJson 
} from '../services/storage';
import { calculateProfileNutrition } from '../services/profileCalculator';
import { 
  formatDateYMD, 
  getDaysOfWeek, 
  getDayOfWeekIndex
} from '../utils/dateUtils';

interface NutritionContextType {
  meals: Meal[];
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  addMeal: (meal: Omit<Meal, 'id' | 'timestamp'> & { id?: string }) => Meal;
  updateMeal: (meal: Meal) => void;
  deleteMeal: (mealId: string) => void;
  favorites: FavoritesData;
  toggleFavoriteFood: (food: Omit<FavoriteFood, 'id' | 'createdAt'> & { id?: string }) => void;
  toggleFavoriteMeal: (meal: Omit<FavoriteMeal, 'id' | 'createdAt'> & { id?: string }) => void;
  removeFavoriteFood: (id: string) => void;
  removeFavoriteMeal: (id: string) => void;
  isFavoriteFood: (name: string) => boolean;
  isFavoriteMeal: (name: string) => boolean;
  currentDaySummary: DaySummary;
  currentWeekSummary: WeekSummary;
  macroTargets: MacroTarget;
  dailyCalorieTarget: number;
  exportData: () => void;
  importData: (file: File) => Promise<{ count: number }>;
  resetData: () => void;
}

const NutritionContext = createContext<NutritionContextType | null>(null);

export const NutritionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meals, setMeals] = useState<Meal[]>(() => loadMeals());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [favorites, setFavorites] = useState<FavoritesData>(() => loadFavorites());
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateYMD(new Date()));

  // Sauvegarde automatique lors des modifications
  useEffect(() => {
    saveMeals(meals);
  }, [meals]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        ...newSettings,
        profile: newSettings.profile ? { ...prev.profile!, ...newSettings.profile } : prev.profile
      };
      return updated;
    });
  }, []);

  const addMeal = useCallback((mealData: Omit<Meal, 'id' | 'timestamp'> & { id?: string }): Meal => {
    const newMeal: Meal = {
      ...mealData,
      id: mealData.id || 'meal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now()
    };

    setMeals((prev) => [newMeal, ...prev]);
    return newMeal;
  }, []);

  const updateMeal = useCallback((updatedMeal: Meal) => {
    setMeals((prev) => prev.map((m) => (m.id === updatedMeal.id ? updatedMeal : m)));
  }, []);

  const deleteMeal = useCallback((mealId: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
  }, []);

  const toggleFavoriteFood = useCallback((foodData: Omit<FavoriteFood, 'id' | 'createdAt'> & { id?: string }) => {
    setFavorites((prev) => {
      const normName = foodData.nom.trim().toLowerCase();
      const existingIndex = prev.foods.findIndex(
        (f) => (foodData.id && f.id === foodData.id) || f.nom.trim().toLowerCase() === normName
      );

      if (existingIndex >= 0) {
        return {
          ...prev,
          foods: prev.foods.filter((_, i) => i !== existingIndex)
        };
      } else {
        const newFood: FavoriteFood = {
          ...foodData,
          id: foodData.id || 'fav_food_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          createdAt: Date.now()
        };
        return {
          ...prev,
          foods: [newFood, ...prev.foods]
        };
      }
    });
  }, []);

  const toggleFavoriteMeal = useCallback((mealData: Omit<FavoriteMeal, 'id' | 'createdAt'> & { id?: string }) => {
    setFavorites((prev) => {
      const normName = mealData.nom.trim().toLowerCase();
      const existingIndex = prev.meals.findIndex(
        (m) => (mealData.id && m.id === mealData.id) || m.nom.trim().toLowerCase() === normName
      );

      if (existingIndex >= 0) {
        return {
          ...prev,
          meals: prev.meals.filter((_, i) => i !== existingIndex)
        };
      } else {
        const newMeal: FavoriteMeal = {
          ...mealData,
          id: mealData.id || 'fav_meal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          createdAt: Date.now()
        };
        return {
          ...prev,
          meals: [newMeal, ...prev.meals]
        };
      }
    });
  }, []);

  const removeFavoriteFood = useCallback((id: string) => {
    setFavorites((prev) => ({
      ...prev,
      foods: prev.foods.filter((f) => f.id !== id)
    }));
  }, []);

  const removeFavoriteMeal = useCallback((id: string) => {
    setFavorites((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== id)
    }));
  }, []);

  const isFavoriteFood = useCallback((name: string) => {
    if (!name) return false;
    const norm = name.trim().toLowerCase();
    return favorites.foods.some((f) => f.nom.trim().toLowerCase() === norm);
  }, [favorites.foods]);

  const isFavoriteMeal = useCallback((name: string) => {
    if (!name) return false;
    const norm = name.trim().toLowerCase();
    return favorites.meals.some((m) => m.nom.trim().toLowerCase() === norm);
  }, [favorites.meals]);

  // Calcul des cibles nutritionnelles selon profil ou réglages manuels
  const calculatedProfile = useMemo(() => {
    if (settings.profile) {
      return calculateProfileNutrition(settings.profile);
    }
    return null;
  }, [settings.profile]);

  const dailyCalorieTarget = useMemo(() => {
    if (settings.customDailyTarget && settings.customDailyTarget > 0) {
      return settings.customDailyTarget;
    }
    if (settings.weeklyCalorieBudget > 0) {
      return Math.round(settings.weeklyCalorieBudget / 7);
    }
    return calculatedProfile?.recommendedDailyCalories || 2500;
  }, [settings.customDailyTarget, settings.weeklyCalorieBudget, calculatedProfile]);

  const macroTargets = useMemo((): MacroTarget => {
    if (calculatedProfile) {
      return calculatedProfile.macroTargets;
    }
    // Cibles par défaut pour 2500 kcal (25% P, 50% G, 25% L)
    return {
      proteins_g: 156,
      carbs_g: 312,
      fats_g: 69,
      fibres_g: 35,
      sodium_mg: 2300
    };
  }, [calculatedProfile]);

  // Résumé de la journée sélectionnée
  const currentDaySummary = useMemo((): DaySummary => {
    const dayMeals = meals.filter((m) => m.date === selectedDate);
    
    let totalCalories = 0;
    let totalProteines = 0;
    let totalGlucides = 0;
    let totalLipides = 0;
    let totalFibres = 0;
    let totalSodium = 0;

    for (const m of dayMeals) {
      for (const ing of m.ingredients) {
        totalCalories += ing.calories || 0;
        totalProteines += ing.proteines_g || 0;
        totalGlucides += ing.glucides_g || 0;
        totalLipides += ing.lipides_g || 0;
        totalFibres += ing.fibres_g || 0;
        totalSodium += ing.sodium_mg || 0;
      }
    }

    return {
      date: selectedDate,
      meals: dayMeals,
      totalCalories: Math.round(totalCalories),
      totalProteines: Number(totalProteines.toFixed(1)),
      totalGlucides: Number(totalGlucides.toFixed(1)),
      totalLipides: Number(totalLipides.toFixed(1)),
      totalFibres: Number(totalFibres.toFixed(1)),
      totalSodium: Math.round(totalSodium),
      targetCalories: dailyCalorieTarget
    };
  }, [meals, selectedDate, dailyCalorieTarget]);

  // Résumé de la semaine (orienté dashboard hebdomadaire dynamique)
  const currentWeekSummary = useMemo((): WeekSummary => {
    const refDate = new Date();
    const days = getDaysOfWeek(refDate);
    const mondayYMD = formatDateYMD(days[0]);
    const sundayYMD = formatDateYMD(days[6]);
    const todayIndex = getDayOfWeekIndex(refDate); // 0 (Lun) .. 6 (Dim)

    const daySummaries: DaySummary[] = days.map((dayDate) => {
      const ymd = formatDateYMD(dayDate);
      const dayMeals = meals.filter((m) => m.date === ymd);

      let cal = 0, p = 0, g = 0, l = 0, fib = 0, sod = 0;
      for (const m of dayMeals) {
        for (const ing of m.ingredients) {
          cal += ing.calories || 0;
          p += ing.proteines_g || 0;
          g += ing.glucides_g || 0;
          l += ing.lipides_g || 0;
          fib += ing.fibres_g || 0;
          sod += ing.sodium_mg || 0;
        }
      }

      return {
        date: ymd,
        meals: dayMeals,
        totalCalories: Math.round(cal),
        totalProteines: Number(p.toFixed(1)),
        totalGlucides: Number(g.toFixed(1)),
        totalLipides: Number(l.toFixed(1)),
        totalFibres: Number(fib.toFixed(1)),
        totalSodium: Math.round(sod),
        targetCalories: dailyCalorieTarget
      };
    });

    // Calories consommées dans les jours passés de la semaine (avant aujourd'hui)
    let pastDaysCalories = 0;
    for (let i = 0; i < todayIndex; i++) {
      pastDaysCalories += daySummaries[i].totalCalories;
    }

    // Calories consommées au total cette semaine (jusqu'à maintenant)
    const consumedCalories = daySummaries.reduce((acc, d) => acc + d.totalCalories, 0);

    const weeklyBudget = settings.weeklyCalorieBudget || 17500;
    const remainingCalories = Math.max(0, weeklyBudget - consumedCalories);

    // Jours restants (aujourd'hui inclus)
    const remainingDaysCount = Math.max(1, 7 - todayIndex);
    const elapsedDaysCount = todayIndex + 1;

    // Calcul de la moyenne journalière restante dynamique :
    // (Budget hebdo total - calories consommées les jours passés) / jours restants
    const remainingBudgetForRestOfWeek = Math.max(0, weeklyBudget - pastDaysCalories);
    const dailyRemainingBudget = Math.round(remainingBudgetForRestOfWeek / remainingDaysCount);

    const avgDailyConsumed = elapsedDaysCount > 0 
      ? Math.round(consumedCalories / elapsedDaysCount) 
      : 0;

    const totalProteines = daySummaries.reduce((acc, d) => acc + d.totalProteines, 0);
    const totalGlucides = daySummaries.reduce((acc, d) => acc + d.totalGlucides, 0);
    const totalLipides = daySummaries.reduce((acc, d) => acc + d.totalLipides, 0);
    const totalFibres = daySummaries.reduce((acc, d) => acc + d.totalFibres, 0);
    const totalSodium = daySummaries.reduce((acc, d) => acc + d.totalSodium, 0);

    return {
      weekStartDate: mondayYMD,
      weekEndDate: sundayYMD,
      days: daySummaries,
      weeklyBudget,
      consumedCalories,
      remainingCalories,
      elapsedDaysCount,
      remainingDaysCount,
      dailyRemainingBudget,
      avgDailyConsumed,
      totalProteines: Number(totalProteines.toFixed(1)),
      totalGlucides: Number(totalGlucides.toFixed(1)),
      totalLipides: Number(totalLipides.toFixed(1)),
      totalFibres: Number(totalFibres.toFixed(1)),
      totalSodium: Math.round(totalSodium)
    };
  }, [meals, settings.weeklyCalorieBudget, dailyCalorieTarget]);

  const exportData = useCallback(() => {
    exportDataAsJson(meals, settings, favorites);
  }, [meals, settings, favorites]);

  const importData = useCallback(async (file: File) => {
    const result = await importDataFromJson(file);
    setMeals(result.meals);
    if (result.settings) {
      setSettings((prev) => ({
        ...prev,
        ...result.settings
      }));
    }
    if (result.favorites) {
      setFavorites(result.favorites);
    }
    return { count: result.meals.length };
  }, []);

  const resetData = useCallback(() => {
    setMeals([]);
    localStorage.removeItem('nutritrack_meals_v1');
  }, []);

  const value = {
    meals,
    selectedDate,
    setSelectedDate,
    settings,
    updateSettings,
    addMeal,
    updateMeal,
    deleteMeal,
    favorites,
    toggleFavoriteFood,
    toggleFavoriteMeal,
    removeFavoriteFood,
    removeFavoriteMeal,
    isFavoriteFood,
    isFavoriteMeal,
    currentDaySummary,
    currentWeekSummary,
    macroTargets,
    dailyCalorieTarget,
    exportData,
    importData,
    resetData
  };

  return (
    <NutritionContext.Provider value={value}>
      {children}
    </NutritionContext.Provider>
  );
};

export function useNutrition(): NutritionContextType {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
}
