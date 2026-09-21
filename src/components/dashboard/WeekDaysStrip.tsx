import React from 'react';
import { useNutrition } from '../../context/NutritionContext';
import { 
  getDaysOfWeek, 
  formatDateYMD, 
  SHORT_DAY_NAMES 
} from '../../utils/dateUtils';

export const WeekDaysStrip: React.FC = () => {
  const { selectedDate, setSelectedDate, currentWeekSummary } = useNutrition();

  const refDate = new Date();
  const days = getDaysOfWeek(refDate);
  const todayYMD = formatDateYMD(refDate);

  return (
    <div className="my-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Semaine en cours
        </h3>
        <span className="text-[11px] text-slate-500 font-medium">
          Tapez un jour pour voir ses repas
        </span>
      </div>

      {/* Bandeau tactile horizontal des 7 jours */}
      <div className="grid grid-cols-7 gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80">
        {days.map((d, index) => {
          const ymd = formatDateYMD(d);
          const isSelected = ymd === selectedDate;
          const isToday = ymd === todayYMD;
          const daySummary = currentWeekSummary.days.find((s) => s.date === ymd);
          const calories = daySummary ? daySummary.totalCalories : 0;
          const hasMeals = daySummary ? daySummary.meals.length > 0 : false;
          const target = daySummary?.targetCalories || 2500;
          const isOver = calories > target;

          return (
            <button
              key={ymd}
              onClick={() => setSelectedDate(ymd)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all relative ${
                isSelected
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25 scale-[1.03] z-10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {/* Point indicateur Aujourd'hui */}
              {isToday && (
                <span className={`text-[9px] font-black uppercase tracking-tighter ${
                  isSelected ? 'text-slate-950' : 'text-emerald-400'
                }`}>
                  Auj.
                </span>
              )}

              {/* Nom abrégé du jour */}
              <span className="text-[11px] font-semibold">
                {SHORT_DAY_NAMES[index]}
              </span>

              {/* Numéro du jour */}
              <span className={`text-sm font-bold ${isSelected ? 'text-slate-950' : 'text-slate-200'}`}>
                {d.getDate()}
              </span>

              {/* Statut calories / indicateur visuel */}
              <div className="mt-1 flex items-center justify-center h-3">
                {hasMeals ? (
                  calories > 0 ? (
                    <span className={`text-[9px] font-bold leading-none ${
                      isSelected 
                        ? 'text-slate-900' 
                        : isOver 
                          ? 'text-rose-400' 
                          : 'text-emerald-400'
                    }`}>
                      {calories > 999 ? `${(calories / 1000).toFixed(1)}k` : calories}
                    </span>
                  ) : null
                ) : (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-slate-900' : 'bg-slate-700'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
