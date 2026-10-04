import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Meal, 
  AppSettings, 
  DaySummary, 
  WeekSummary, 
  MacroTarget,
  FavoritesData,
  FavoriteFood,
  FavoriteMeal,
  WeekHistoryItem,
  OverallAnalytics
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
  parseDateYMD,
  getMondayOfWeek,
  getDaysOfWeek, 
  getDayOfWeekIndex,
  shiftDateByWeeks,
  isCurrentWeekMonday,
  isPastWeekMonday,
  isFutureWeekMonday,
  getWeekRangeLabel
} from '../utils/dateUtils';

interface NutritionContextType {
  meals: Meal[];
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  displayedWeekMonday: Date;
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
  weekHistory: WeekHistoryItem[];
  overallAnalytics: OverallAnalytics;
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

  const goToPreviousWeek = useCallback(() => {
    const cur = parseDateYMD(selectedDate);
    const shifted = shiftDateByWeeks(cur, -1);
    setSelectedDate(formatDateYMD(shifted));
  }, [selectedDate]);

  const goToNextWeek = useCallback(() => {
    const cur = parseDateYMD(selectedDate);
    const shifted = shiftDateByWeeks(cur, 1);
    setSelectedDate(formatDateYMD(shifted));
  }, [selectedDate]);

  const goToCurrentWeek = useCallback(() => {
    setSelectedDate(formatDateYMD(new Date()));
  }, []);

  const displayedWeekMonday = useMemo(() => {
    return getMondayOfWeek(parseDateYMD(selectedDate));
  }, [selectedDate]);

  // Résumé de la semaine (orienté dashboard hebdomadaire dynamique selon selectedDate)
  const currentWeekSummary = useMemo((): WeekSummary => {
    const monday = getMondayOfWeek(parseDateYMD(selectedDate));
    const days = getDaysOfWeek(monday);
    const mondayYMD = formatDateYMD(days[0]);
    const sundayYMD = formatDateYMD(days[6]);
    const today = new Date();
    const isCurrent = isCurrentWeekMonday(monday);
    const isPast = isPastWeekMonday(monday);
    const isFuture = isFutureWeekMonday(monday);
    const weekLabel = getWeekRangeLabel(monday);

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

    const weeklyBudget = settings.weeklyCalorieBudget || 17500;
    const consumedCalories = daySummaries.reduce((acc, d) => acc + d.totalCalories, 0);
    const remainingCalories = Math.max(0, weeklyBudget - consumedCalories);

    let elapsedDaysCount = 7;
    let remainingDaysCount = 0;
    let dailyRemainingBudget = dailyCalorieTarget;
    let avgDailyConsumed = 0;

    if (isPast) {
      // Semaine clôturée dans le passé
      elapsedDaysCount = 7;
      remainingDaysCount = 0;
      dailyRemainingBudget = 0;
      avgDailyConsumed = Math.round(consumedCalories / 7);
    } else if (isCurrent) {
      const todayIndex = getDayOfWeekIndex(today); // 0 (Lun) .. 6 (Dim)
      elapsedDaysCount = todayIndex + 1;
      remainingDaysCount = Math.max(1, 7 - todayIndex);
      avgDailyConsumed = elapsedDaysCount > 0 
        ? Math.round(consumedCalories / elapsedDaysCount) 
        : 0;

      // Calories consommées lors des jours passés (avant aujourd'hui)
      let pastDaysCalories = 0;
      for (let i = 0; i < todayIndex; i++) {
        pastDaysCalories += daySummaries[i].totalCalories;
      }

      const pastTarget = todayIndex * dailyCalorieTarget;
      const pastSurplus = pastDaysCalories - pastTarget;

      if (pastSurplus > 0) {
        // En cas d'excès précédent : on compense doucement, plafonné à -250 kcal/jour
        const compensationPerDay = Math.round(pastSurplus / remainingDaysCount);
        const safeCompensation = Math.min(compensationPerDay, 250);
        dailyRemainingBudget = Math.max(1200, dailyCalorieTarget - safeCompensation);
      } else {
        // En cas de DÉFICIT : RÈGLE FIXÉE (aucun report abusif vers le haut !)
        // Un déficit n'est PAS une dette à combler. La cible reste normale.
        dailyRemainingBudget = dailyCalorieTarget;
      }
    } else {
      // Semaine future
      elapsedDaysCount = 0;
      remainingDaysCount = 7;
      dailyRemainingBudget = dailyCalorieTarget;
      avgDailyConsumed = 0;
    }

    const totalProteines = daySummaries.reduce((acc, d) => acc + d.totalProteines, 0);
    const totalGlucides = daySummaries.reduce((acc, d) => acc + d.totalGlucides, 0);
    const totalLipides = daySummaries.reduce((acc, d) => acc + d.totalLipides, 0);
    const totalFibres = daySummaries.reduce((acc, d) => acc + d.totalFibres, 0);
    const totalSodium = daySummaries.reduce((acc, d) => acc + d.totalSodium, 0);

    return {
      weekStartDate: mondayYMD,
      weekEndDate: sundayYMD,
      weekLabel,
      isCurrentWeek: isCurrent,
      isPastWeek: isPast,
      isFutureWeek: isFuture,
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
  }, [meals, selectedDate, settings.weeklyCalorieBudget, dailyCalorieTarget]);

  // Historique multi-semaines pour le Board de suivi (8 dernières semaines)
  const weekHistory = useMemo((): WeekHistoryItem[] => {
    const currentMonday = getMondayOfWeek(new Date());
    const items: WeekHistoryItem[] = [];
    const weeklyBudget = settings.weeklyCalorieBudget || 17500;

    for (let w = 0; w < 8; w++) {
      const mon = shiftDateByWeeks(currentMonday, -w);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const monYMD = formatDateYMD(mon);
      const sunYMD = formatDateYMD(sun);
      const isCurrent = w === 0;

      // Filtrage des repas appartenant exclusivement à cette semaine
      const weekMeals = meals.filter((m) => m.date >= monYMD && m.date <= sunYMD);

      let totalCals = 0;
      let totalP = 0;
      let totalG = 0;
      let totalL = 0;
      const daysWithMeals = new Set<string>();

      for (const m of weekMeals) {
        daysWithMeals.add(m.date);
        for (const ing of m.ingredients) {
          totalCals += ing.calories || 0;
          totalP += ing.proteines_g || 0;
          totalG += ing.glucides_g || 0;
          totalL += ing.lipides_g || 0;
        }
      }

      const daysCount = isCurrent ? Math.max(1, getDayOfWeekIndex(new Date()) + 1) : 7;
      const avgDailyCals = Math.round(totalCals / daysCount);
      const avgDailyP = Number((totalP / daysCount).toFixed(1));

      let status: 'on_track' | 'deficit' | 'surplus' = 'on_track';
      const expectedBudgetSoFar = isCurrent ? Math.round((weeklyBudget / 7) * daysCount) : weeklyBudget;
      if (totalCals > expectedBudgetSoFar + 300) {
        status = 'surplus';
      } else if (totalCals < expectedBudgetSoFar - 500) {
        status = 'deficit';
      }

      items.push({
        weekStartDate: monYMD,
        weekEndDate: sunYMD,
        weekLabel: getWeekRangeLabel(mon),
        isCurrentWeek: isCurrent,
        consumedCalories: Math.round(totalCals),
        weeklyBudget,
        avgDailyCalories: avgDailyCals,
        totalProteines: Number(totalP.toFixed(1)),
        avgDailyProteines: avgDailyP,
        totalGlucides: Number(totalG.toFixed(1)),
        totalLipides: Number(totalL.toFixed(1)),
        mealsCount: weekMeals.length,
        daysWithMealsCount: daysWithMeals.size,
        status
      });
    }

    return items;
  }, [meals, settings.weeklyCalorieBudget]);

  // Statistiques globales et utilisation mémoire
  const overallAnalytics = useMemo((): OverallAnalytics => {
    const totalMealsCount = meals.length;
    const uniqueDates = Array.from(new Set(meals.map((m) => m.date))).sort();
    const totalDaysLogged = uniqueDates.length;

    let streak = 0;
    if (uniqueDates.length > 0) {
      const todayYMD = formatDateYMD(new Date());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = formatDateYMD(yesterday);
      const lastLogged = uniqueDates[uniqueDates.length - 1];

      if (lastLogged === todayYMD || lastLogged === yestStr) {
        streak = 1;
        let checkDate = parseDateYMD(lastLogged);
        for (let i = uniqueDates.length - 2; i >= 0; i--) {
          const expectedPrev = new Date(checkDate);
          expectedPrev.setDate(expectedPrev.getDate() - 1);
          if (uniqueDates[i] === formatDateYMD(expectedPrev)) {
            streak++;
            checkDate = parseDateYMD(uniqueDates[i]);
          } else {
            break;
          }
        }
      }
    }

    let sumCals = 0;
    let sumP = 0;
    let sumG = 0;
    let sumL = 0;

    for (const m of meals) {
      for (const ing of m.ingredients) {
        sumCals += ing.calories || 0;
        sumP += ing.proteines_g || 0;
        sumG += ing.glucides_g || 0;
        sumL += ing.lipides_g || 0;
      }
    }

    const divisor = Math.max(1, totalDaysLogged);
    const avgDailyCalories = Math.round(sumCals / divisor);
    const avgDailyProteines = Number((sumP / divisor).toFixed(1));
    const avgDailyCarbs = Number((sumG / divisor).toFixed(1));
    const avgDailyFats = Number((sumL / divisor).toFixed(1));

    // Calcul de l'empreinte mémoire locale réelle
    let totalBytes = 0;
    try {
      const mStr = localStorage.getItem('nutritrack_meals_v1') || '';
      const sStr = localStorage.getItem('nutritrack_settings_v1') || '';
      const fStr = localStorage.getItem('nutritrack_favorites_v1') || '';
      totalBytes = (mStr.length + sStr.length + fStr.length) * 2; // UTF-16
    } catch {
      totalBytes = JSON.stringify(meals).length * 2;
    }

    const storageUsageKb = Number((totalBytes / 1024).toFixed(1));
    const storageMaxKb = 5120; // 5 Mo quota standard
    const storagePercent = Number(((storageUsageKb / storageMaxKb) * 100).toFixed(2));

    return {
      totalMealsCount,
      totalDaysLogged,
      currentStreakDays: streak,
      avgDailyCalories,
      avgDailyProteines,
      avgDailyCarbs,
      avgDailyFats,
      storageUsageKb,
      storageMaxKb,
      storagePercent
    };
  }, [meals]);

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
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    displayedWeekMonday,
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
    weekHistory,
    overallAnalytics,
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
