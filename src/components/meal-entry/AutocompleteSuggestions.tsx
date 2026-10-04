import React, { useMemo } from 'react';
import { Star, Utensils, Apple } from 'lucide-react';
import { FavoriteFood, FavoriteMeal } from '../../types/nutrition';
import { useNutrition } from '../../context/NutritionContext';

interface AutocompleteSuggestionsProps {
  query: string;
  mode?: 'food' | 'meal' | 'both';
  onSelectFood?: (food: FavoriteFood) => void;
  onSelectMeal?: (meal: FavoriteMeal) => void;
  alwaysShowChipsIfEmpty?: boolean;
  className?: string;
}

function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const AutocompleteSuggestions: React.FC<AutocompleteSuggestionsProps> = ({
  query,
  mode = 'both',
  onSelectFood,
  onSelectMeal,
  alwaysShowChipsIfEmpty = false,
  className = ''
}) => {
  const { favorites } = useNutrition();

  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeString(trimmedQuery);

  const matchedFoods = useMemo(() => {
    if (mode === 'meal') return [];
    if (!favorites.foods || favorites.foods.length === 0) return [];

    if (!normalizedQuery) {
      return alwaysShowChipsIfEmpty ? favorites.foods.slice(0, 4) : [];
    }

    if (normalizedQuery.length < 2) return [];

    return favorites.foods
      .filter((f) => normalizeString(f.nom).includes(normalizedQuery))
      .slice(0, 4);
  }, [favorites.foods, normalizedQuery, mode, alwaysShowChipsIfEmpty]);

  const matchedMeals = useMemo(() => {
    if (mode === 'food') return [];
    if (!favorites.meals || favorites.meals.length === 0) return [];

    if (!normalizedQuery) {
      return alwaysShowChipsIfEmpty ? favorites.meals.slice(0, 3) : [];
    }

    if (normalizedQuery.length < 2) return [];

    return favorites.meals
      .filter((m) => normalizeString(m.nom).includes(normalizedQuery))
      .slice(0, 3);
  }, [favorites.meals, normalizedQuery, mode, alwaysShowChipsIfEmpty]);

  const hasMatches = matchedFoods.length > 0 || matchedMeals.length > 0;

  if (!hasMatches) return null;

  return (
    <div className={`space-y-1.5 animate-fadeIn ${className}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
        <span>{normalizedQuery ? 'Suggestions favorites :' : 'Vos favoris rapides :'}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Plats favoris */}
        {matchedMeals.map((meal) => (
          <button
            key={meal.id}
            type="button"
            onClick={() => onSelectMeal && onSelectMeal(meal)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:text-amber-100 text-xs font-semibold active:scale-95 transition-all shadow-sm"
          >
            <Utensils className="w-3 h-3 text-amber-400" />
            <span className="font-bold">{meal.nom}</span>
            <span className="text-[10px] text-amber-300/80 font-normal">
              {meal.totalCalories} kcal
            </span>
          </button>
        ))}

        {/* Aliments individuels favoris */}
        {matchedFoods.map((food) => (
          <button
            key={food.id}
            type="button"
            onClick={() => onSelectFood && onSelectFood(food)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white text-xs font-semibold active:scale-95 transition-all shadow-sm"
          >
            <Apple className="w-3 h-3 text-emerald-400" />
            <span className="font-bold">{food.nom}</span>
            <span className="text-[10px] text-emerald-400 font-normal">
              {food.calories} kcal ({food.poids_g}g)
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
