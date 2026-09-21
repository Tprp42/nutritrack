import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Zap
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';

export const WeeklyBudgetCard: React.FC = () => {
  const { currentWeekSummary } = useNutrition();

  const {
    weeklyBudget,
    consumedCalories,
    remainingCalories,
    remainingDaysCount,
    dailyRemainingBudget,
    totalProteines,
    totalGlucides,
    totalLipides
  } = currentWeekSummary;

  // Calcul du pourcentage consommé
  const percentConsumed = Math.min(Math.round((consumedCalories / weeklyBudget) * 100), 100);
  const isOverBudget = consumedCalories > weeklyBudget;
  const standardDailyAvg = Math.round(weeklyBudget / 7);
  const diffFromStandard = dailyRemainingBudget - standardDailyAvg;

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
      {/* Glow décoratif en arrière plan */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* En-tête : Titre & Budget total */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Budget Hebdomadaire
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Objectif : </span>
          <span className="text-xs font-bold text-slate-200">
            {weeklyBudget.toLocaleString('fr-FR')} kcal
          </span>
        </div>
      </div>

      {/* Jauge Principale & Chiffres Clés */}
      <div className="grid grid-cols-2 gap-4 items-center mb-4 relative z-10">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {consumedCalories.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-semibold text-slate-400">kcal</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            consommées sur la semaine
          </p>
        </div>

        <div className="text-right border-l border-slate-800/80 pl-4">
          <div className="flex items-baseline justify-end gap-1.5">
            <span className={`text-3xl font-extrabold tracking-tight ${
              isOverBudget ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {remainingCalories.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-semibold text-slate-400">kcal</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            restantes cette semaine
          </p>
        </div>
      </div>

      {/* Barre de progression avec dégradé */}
      <div className="w-full h-3 bg-slate-950 rounded-full p-0.5 border border-slate-800 mb-4 relative z-10">
        <div 
          className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${
            isOverBudget 
              ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/50' 
              : percentConsumed > 85 
                ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 shadow-amber-500/40' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/30'
          }`}
          style={{ width: `${percentConsumed}%` }}
        />
      </div>

      {/* Carte Spéciale : Moyenne Journalière Restante Dynamique */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 mb-3 relative z-10">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Moyenne recommandée restante</span>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
            {remainingDaysCount} {remainingDaysCount > 1 ? 'jours restants' : 'jour restant'}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">
              {dailyRemainingBudget.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs text-slate-400 font-medium">kcal / jour</span>
          </div>

          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg border ${
            diffFromStandard > 50
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : diffFromStandard < -50
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            {diffFromStandard > 50 ? (
              <>
                <TrendingUp className="w-3 h-3" />
                <span>+{diffFromStandard} kcal de marge</span>
              </>
            ) : diffFromStandard < -50 ? (
              <>
                <TrendingDown className="w-3 h-3" />
                <span>{diffFromStandard} kcal à compenser</span>
              </>
            ) : (
              <span>Rythme stable</span>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
          {diffFromStandard > 50 
            ? "Grâce à vos repas précédents, vous disposez d'une marge supplémentaire pour les jours restants."
            : diffFromStandard < -50
              ? "Calcul auto-rééquilibré pour respecter votre budget hebdomadaire sans compromettre vos objectifs."
              : "Parfaitement aligné avec votre moyenne cible hebdomadaire."
          }
        </p>
      </div>

      {/* Résumé Macronutriments de la semaine */}
      <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800/60 relative z-10">
        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block font-medium">Protéines</span>
          <span className="text-sm font-bold text-sky-400">{totalProteines}g</span>
        </div>
        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block font-medium">Glucides</span>
          <span className="text-sm font-bold text-emerald-400">{totalGlucides}g</span>
        </div>
        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block font-medium">Lipides</span>
          <span className="text-sm font-bold text-amber-400">{totalLipides}g</span>
        </div>
      </div>
    </div>
  );
};
