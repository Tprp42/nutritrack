import React, { useState } from 'react';
import { Meal, MealType } from '../../types/nutrition';
import { useNutrition } from '../../context/NutritionContext';
import { 
  Utensils, 
  Coffee, 
  Moon, 
  Apple, 
  Camera, 
  MessageSquareText, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Plus
} from 'lucide-react';

interface MealListProps {
  onOpenNewMeal: () => void;
  onEditMeal: (meal: Meal) => void;
}

export const MealList: React.FC<MealListProps> = ({ onOpenNewMeal, onEditMeal }) => {
  const { currentDaySummary, deleteMeal } = useNutrition();
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  const { meals } = currentDaySummary;

  const getMealTypeConfig = (type: MealType) => {
    switch (type) {
      case 'breakfast':
        return { label: 'Petit-déjeuner', icon: Coffee, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'lunch':
        return { label: 'Déjeuner', icon: Utensils, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'dinner':
        return { label: 'Dîner', icon: Moon, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
      case 'snack':
        return { label: 'Collation', icon: Apple, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
      default:
        return { label: 'Repas', icon: Utensils, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedMealId(expandedMealId === id ? null : id);
  };

  return (
    <div className="mb-24">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Repas enregistrés ({meals.length})
        </h3>
        {meals.length > 0 && (
          <button
            onClick={onOpenNewMeal}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        )}
      </div>

      {meals.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Utensils className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">
            Aucun repas pour ce jour
          </h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
            Prenez votre plat en photo ou tapez une courte description pour que l'IA calcule instantanément vos calories.
          </p>
          <button
            onClick={onOpenNewMeal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Enregistrer un repas
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => {
            const config = getMealTypeConfig(meal.mealType);
            const Icon = config.icon;
            const isExpanded = expandedMealId === meal.id;

            const mealCalories = meal.ingredients.reduce((acc, ing) => acc + (ing.calories || 0), 0);
            const mealProteins = Number(meal.ingredients.reduce((acc, ing) => acc + (ing.proteines_g || 0), 0).toFixed(1));
            const mealCarbs = Number(meal.ingredients.reduce((acc, ing) => acc + (ing.glucides_g || 0), 0).toFixed(1));
            const mealFats = Number(meal.ingredients.reduce((acc, ing) => acc + (ing.lipides_g || 0), 0).toFixed(1));

            return (
              <div 
                key={meal.id}
                className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-md hover:border-slate-700/80 transition-all"
              >
                {/* Ligne 1 : Type, Heure, Source & Actions */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {meal.time}
                    </span>
                    {meal.source === 'photo' && (
                      <span className="text-slate-400" title="Analysé par photo">
                        <Camera className="w-3 h-3" />
                      </span>
                    )}
                    {meal.source === 'text' && (
                      <span className="text-slate-400" title="Analysé par texte">
                        <MessageSquareText className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditMeal(meal)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Modifier les quantités"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer le repas "${meal.repas_nom}" ?`)) {
                          deleteMeal(meal.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ligne 2 : Nom du plat & Calories */}
                <div className="flex items-baseline justify-between gap-2 mb-2.5">
                  <h4 className="font-bold text-sm text-white tracking-tight line-clamp-1">
                    {meal.repas_nom}
                  </h4>
                  <div className="flex items-baseline gap-1 text-right flex-shrink-0">
                    <span className="text-base font-extrabold text-white">
                      {mealCalories}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">kcal</span>
                  </div>
                </div>

                {/* Ligne 3 : Badges Macros P / G / L */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-lg py-1 px-2 text-center">
                    <span className="text-[9px] text-slate-400 block font-medium">P</span>
                    <span className="text-xs font-bold text-sky-400">{mealProteins}g</span>
                  </div>
                  <div className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-lg py-1 px-2 text-center">
                    <span className="text-[9px] text-slate-400 block font-medium">G</span>
                    <span className="text-xs font-bold text-emerald-400">{mealCarbs}g</span>
                  </div>
                  <div className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-lg py-1 px-2 text-center">
                    <span className="text-[9px] text-slate-400 block font-medium">L</span>
                    <span className="text-xs font-bold text-amber-400">{mealFats}g</span>
                  </div>
                </div>

                {/* Bouton pour afficher/masquer les ingrédients */}
                <button
                  onClick={() => toggleExpand(meal.id)}
                  className="w-full pt-1.5 flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 border-t border-slate-800/60 transition-colors"
                >
                  <span>{meal.ingredients.length} ingrédient{meal.ingredients.length > 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-0.5 text-slate-500">
                    {isExpanded ? 'Masquer' : 'Voir le détail'}
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </span>
                </button>

                {/* Tiroir détaillé des ingrédients */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/50 space-y-1.5">
                    {meal.ingredients.map((ing) => (
                      <div 
                        key={ing.id}
                        className="flex items-center justify-between text-xs py-1 px-2 bg-slate-950/40 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          <span className="text-slate-200 font-medium">{ing.nom}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 font-medium">
                          <span className="text-slate-300">{ing.poids_estime_g}g</span>
                          <span>•</span>
                          <span className="text-white font-semibold">{ing.calories} kcal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
