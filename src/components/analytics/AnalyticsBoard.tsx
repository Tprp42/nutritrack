import React from 'react';
import { 
  TrendingUp, 
  Flame, 
  Dumbbell, 
  Calendar, 
  HardDrive, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Download
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';

interface AnalyticsBoardProps {
  onGoToWeek: (weekStartDate: string) => void;
}

export const AnalyticsBoard: React.FC<AnalyticsBoardProps> = ({ onGoToWeek }) => {
  const { 
    weekHistory, 
    overallAnalytics, 
    dailyCalorieTarget, 
    macroTargets, 
    exportData 
  } = useNutrition();

  const {
    totalMealsCount,
    totalDaysLogged,
    currentStreakDays,
    avgDailyCalories,
    avgDailyProteines,
    avgDailyCarbs,
    avgDailyFats,
    storageUsageKb,
    storagePercent
  } = overallAnalytics;

  // Calcul du % de protéines atteint en moyenne
  const protTarget = macroTargets.proteins_g;
  const protPercent = Math.min(Math.round((avgDailyProteines / protTarget) * 100), 100);

  // Calcul de la répartition calorique moyenne (4 kcal/g pour P et G, 9 kcal/g pour L)
  const totalMacroCals = (avgDailyProteines * 4) + (avgDailyCarbs * 4) + (avgDailyFats * 9);
  const pRatio = totalMacroCals > 0 ? Math.round(((avgDailyProteines * 4) / totalMacroCals) * 100) : 25;
  const gRatio = totalMacroCals > 0 ? Math.round(((avgDailyCarbs * 4) / totalMacroCals) * 100) : 50;
  const lRatio = totalMacroCals > 0 ? Math.round(((avgDailyFats * 9) / totalMacroCals) * 100) : 25;

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* En-tête du Board */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Tableau de Suivi & Progression
            </h2>
            <p className="text-xs text-slate-400">
              Analyse de vos calories, protéines et régularité
            </p>
          </div>
        </div>
      </div>

      {/* Cartes Métriques Clés (Grid 2x2) */}
      <div className="grid grid-cols-2 gap-3">
        {/* 1. Moyenne Calories */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Moy. Calories
            </span>
            <span className="text-[10px] text-slate-400">/ jour</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">
              {avgDailyCalories > 0 ? avgDailyCalories.toLocaleString('fr-FR') : '—'}
            </span>
            <span className="text-xs font-semibold text-slate-400">kcal</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Cible : {dailyCalorieTarget} kcal</span>
            {avgDailyCalories > 0 && (
              <span className={avgDailyCalories <= dailyCalorieTarget ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {avgDailyCalories <= dailyCalorieTarget ? 'Déficit sain' : 'Surplus'}
              </span>
            )}
          </div>
        </div>

        {/* 2. Moyenne Protéines */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
              Moy. Protéines
            </span>
            <span className="text-[10px] text-slate-400">/ jour</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-sky-400">
              {avgDailyProteines > 0 ? `${avgDailyProteines}g` : '—'}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ {protTarget}g</span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-sky-400 rounded-full transition-all duration-500" 
              style={{ width: `${protPercent}%` }}
            />
          </div>
        </div>

        {/* 3. Régularité & Jours Suivis */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Régularité
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">Actif</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">
              {currentStreakDays > 0 ? currentStreakDays : totalDaysLogged}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {currentStreakDays > 0 ? 'j d\'affilée' : 'jours saisis'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            {totalMealsCount} repas enregistrés
          </p>
        </div>

        {/* 4. Empreinte Mémoire Locale */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-teal-400" />
              Mémoire Locale
            </span>
            <span className="text-[10px] text-teal-400 font-bold">Safe</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">
              {storageUsageKb}
            </span>
            <span className="text-xs font-semibold text-slate-400">Ko / 5 Mo</span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-teal-400 rounded-full" 
              style={{ width: `${Math.max(storagePercent, 2)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Répartition Moyenne des Macronutriments */}
      {avgDailyCalories > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Profil Macronutritionnel Moyen</span>
            <span className="text-[10px] text-slate-400 font-normal">Sur vos repas saisis</span>
          </h3>

          {/* Barre segmentée P / G / L */}
          <div className="w-full h-3 rounded-full overflow-hidden flex gap-0.5 bg-slate-950 p-0.5 border border-slate-800 mb-3">
            <div 
              className="bg-sky-400 h-full rounded-l-full transition-all" 
              style={{ width: `${pRatio}%` }} 
              title={`Protéines: ${pRatio}%`}
            />
            <div 
              className="bg-emerald-400 h-full transition-all" 
              style={{ width: `${gRatio}%` }} 
              title={`Glucides: ${gRatio}%`}
            />
            <div 
              className="bg-amber-400 h-full rounded-r-full transition-all" 
              style={{ width: `${lRatio}%` }} 
              title={`Lipides: ${lRatio}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-medium">Protéines ({pRatio}%)</span>
              <span className="text-sm font-bold text-sky-400">{avgDailyProteines}g / jour</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-medium">Glucides ({gRatio}%)</span>
              <span className="text-sm font-bold text-emerald-400">{avgDailyCarbs}g / jour</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-medium">Lipides ({lRatio}%)</span>
              <span className="text-sm font-bold text-amber-400">{avgDailyFats}g / jour</span>
            </div>
          </div>
        </div>
      )}

      {/* Historique Visuel des Semaines */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Historique des Semaines
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Évolution hebdomadaire de vos apports caloriques
            </p>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            {weekHistory.length} semaines
          </span>
        </div>

        <div className="space-y-3">
          {weekHistory.map((week) => {
            const percent = Math.min(Math.round((week.consumedCalories / week.weeklyBudget) * 100), 100);
            const isOver = week.consumedCalories > week.weeklyBudget;
            const diff = week.weeklyBudget - week.consumedCalories;

            return (
              <div 
                key={week.weekStartDate}
                className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 transition-all hover:border-slate-700/80"
              >
                {/* Ligne 1 : Titre semaine & Badge statut */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-tight">
                      {week.weekLabel}
                    </span>
                    {week.isCurrentWeek && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                        En cours
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {week.consumedCalories === 0 ? (
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                        Aucun repas
                      </span>
                    ) : isOver ? (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> +{Math.abs(diff)} kcal
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {diff > 0 ? `-${diff} kcal` : 'Atteint'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ligne 2 : Chiffres calories & barre de progression */}
                <div className="flex items-baseline justify-between mb-1.5 text-xs">
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-white text-sm">
                      {week.consumedCalories.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-slate-400 text-[11px]">/ {week.weeklyBudget.toLocaleString('fr-FR')} kcal</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Moy. <strong>{week.avgDailyCalories}</strong> kcal/j • <strong>{week.avgDailyProteines}g</strong> P/j
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver 
                        ? 'bg-rose-500' 
                        : week.consumedCalories === 0
                          ? 'bg-transparent'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Actions : Aller au journal de cette semaine */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px]">
                  <span className="text-slate-400">
                    {week.mealsCount} repas ({week.daysWithMealsCount}/7 jours)
                  </span>
                  <button
                    onClick={() => onGoToWeek(week.weekStartDate)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5 transition-colors active:scale-95"
                  >
                    <span>Ouvrir dans le journal</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note d'Information sur la Mémoire & Bouton d'Export */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Vos données sont enregistrées en toute sécurité dans votre appareil. Vous pouvez conserver plusieurs années de repas sans aucun impact de mémoire.
        </p>
        <button
          onClick={exportData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Sauvegarder mes données (Export JSON)</span>
        </button>
      </div>
    </div>
  );
};
