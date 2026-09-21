import React, { useState } from 'react';
import { useNutrition } from '../../context/NutritionContext';
import { 
  ChevronDown, 
  ChevronUp, 
  Info
} from 'lucide-react';

export const MacroNutrientBreakdown: React.FC = () => {
  const { currentDaySummary, macroTargets, dailyCalorieTarget } = useNutrition();
  const [showMicros, setShowMicros] = useState(false);

  const {
    totalCalories,
    totalProteines,
    totalGlucides,
    totalLipides,
    totalFibres,
    totalSodium
  } = currentDaySummary;

  const calPercent = Math.min(Math.round((totalCalories / dailyCalorieTarget) * 100), 100);
  const protPercent = Math.min(Math.round((totalProteines / macroTargets.proteins_g) * 100), 100);
  const carbsPercent = Math.min(Math.round((totalGlucides / macroTargets.carbs_g) * 100), 100);
  const fatsPercent = Math.min(Math.round((totalLipides / macroTargets.fats_g) * 100), 100);
  const fibresPercent = Math.min(Math.round((totalFibres / macroTargets.fibres_g) * 100), 100);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
      {/* En-tête : Calories du Jour */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Objectifs du jour
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-white">
              {totalCalories}
            </span>
            <span className="text-xs text-slate-400">
              / {dailyCalorieTarget} kcal
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            {calPercent}% de l'objectif
          </span>
        </div>
      </div>

      {/* Barre globale calories */}
      <div className="w-full h-2.5 bg-slate-950 rounded-full p-0.5 border border-slate-800/80 mb-5">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            totalCalories > dailyCalorieTarget
              ? 'bg-rose-500'
              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
          }`}
          style={{ width: `${calPercent}%` }}
        />
      </div>

      {/* Les 3 Macronutriments Principaux (Vue épurée par défaut) */}
      <div className="space-y-3">
        {/* Protéines */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-sky-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Protéines
            </span>
            <span className="text-slate-300 font-medium">
              <strong className="text-white">{totalProteines}g</strong> / {macroTargets.proteins_g}g
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
            <div 
              className="h-full bg-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${protPercent}%` }}
            />
          </div>
        </div>

        {/* Glucides */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Glucides
            </span>
            <span className="text-slate-300 font-medium">
              <strong className="text-white">{totalGlucides}g</strong> / {macroTargets.carbs_g}g
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
            <div 
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${carbsPercent}%` }}
            />
          </div>
        </div>

        {/* Lipides */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Lipides
            </span>
            <span className="text-slate-300 font-medium">
              <strong className="text-white">{totalLipides}g</strong> / {macroTargets.fats_g}g
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
            <div 
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${fatsPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bouton Toggle "Plus de détails / Micronutriments" pour garder l'UI épurée */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <button
          onClick={() => setShowMicros(!showMicros)}
          className="w-full py-1.5 px-3 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 text-xs font-semibold text-slate-300 flex items-center justify-between transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showMicros ? 'Masquer les micronutriments' : '+ Plus de détails (Fibres & Sodium)'}</span>
          </span>
          {showMicros ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Tiroir dépliable des Micronutriments */}
        {showMicros && (
          <div className="mt-3 p-3 bg-slate-950/70 rounded-2xl border border-slate-800/60 space-y-3 transition-all animate-fadeIn">
            {/* Fibres */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  Fibres alimentaires
                </span>
                <span className="text-slate-300 font-medium">
                  <strong className="text-white">{totalFibres}g</strong> / {macroTargets.fibres_g}g
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${fibresPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Cible santé : digestion & satiété
              </span>
            </div>

            {/* Sodium */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  Sodium
                </span>
                <span className="text-slate-300 font-medium">
                  <strong className={totalSodium > 2300 ? 'text-rose-400 font-bold' : 'text-white'}>
                    {totalSodium} mg
                  </strong>{' '}
                  / {macroTargets.sodium_mg} mg max
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalSodium > 2300 ? 'bg-rose-500' : 'bg-violet-400'
                  }`}
                  style={{ width: `${Math.min(Math.round((totalSodium / 2300) * 100), 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Recommandation OMS : &lt; 2 300 mg/jour
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
