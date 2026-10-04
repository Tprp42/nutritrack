import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  RotateCcw
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { 
  formatDateYMD, 
  parseDateYMD,
  SHORT_DAY_NAMES 
} from '../../utils/dateUtils';

export const WeekDaysStrip: React.FC = () => {
  const { 
    selectedDate, 
    setSelectedDate, 
    currentWeekSummary,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek
  } = useNutrition();

  const todayYMD = formatDateYMD(new Date());
  const { weekLabel, isCurrentWeek, days } = currentWeekSummary;

  return (
    <div className="my-4">
      {/* Barre de navigation entre les semaines */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <button
          onClick={goToPreviousWeek}
          className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1 text-xs font-semibold"
          title="Semaine précédente"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Préc.</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <span className="text-xs font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>{weekLabel}</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isCurrentWeek ? (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                  Semaine en cours
                </span>
              ) : (
                <button
                  onClick={goToCurrentWeek}
                  className="text-[10px] font-bold text-sky-400 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                  title="Revenir à aujourd'hui"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Revenir à cette semaine</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={goToNextWeek}
          className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1 text-xs font-semibold"
          title="Semaine suivante"
          aria-label="Semaine suivante"
        >
          <span className="hidden sm:inline">Suiv.</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bandeau tactile horizontal des 7 jours */}
      <div className="grid grid-cols-7 gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 shadow-lg">
        {days.map((daySummary, index) => {
          const ymd = daySummary.date;
          const dayDate = parseDateYMD(ymd);
          const isSelected = ymd === selectedDate;
          const isToday = ymd === todayYMD;
          const calories = daySummary.totalCalories;
          const hasMeals = daySummary.meals.length > 0;
          const target = daySummary.targetCalories || 2500;
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
                {dayDate.getDate()}
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

