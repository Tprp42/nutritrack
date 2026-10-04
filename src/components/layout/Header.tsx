import React from 'react';
import { 
  Sparkles, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Flame,
  Target
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { formatDateYMD, formatFriendlyDate, parseDateYMD } from '../../utils/dateUtils';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenProfile }) => {
  const { selectedDate, setSelectedDate, settings } = useNutrition();

  const handlePrevDay = () => {
    const d = parseDateYMD(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateYMD(d));
  };

  const handleNextDay = () => {
    const d = parseDateYMD(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateYMD(d));
  };

  const handleResetToday = () => {
    setSelectedDate(formatDateYMD(new Date()));
  };

  const isToday = selectedDate === formatDateYMD(new Date());

  const goalLabels: Record<string, string> = {
    fat_loss: 'Perte de poids',
    maintenance: 'Maintien',
    muscle_gain: 'Prise de masse'
  };

  const goal = settings.profile?.goal || 'maintenance';

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 pt-[max(12px,env(safe-area-inset-top))] px-4 pb-3 transition-all">
      <div className="max-w-md mx-auto">
        {/* Ligne 1 : Logo & Actions Profil / Réglages */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-emerald-400 fill-emerald-400/30" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">NutriTrack</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> IA
                </span>
              </div>
              <button 
                onClick={onOpenProfile}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors text-left"
              >
                <Target className="w-3 h-3 text-emerald-500" />
                <span>{goalLabels[goal]}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-medium">{settings.profile?.weightKg || 75} kg</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!settings.geminiApiKey && (
              <button
                onClick={onOpenSettings}
                className="px-2.5 py-1 text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg animate-pulse"
              >
                Clé requise
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors active:scale-95"
              aria-label="Paramètres"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ligne 2 : Sélecteur de date journalière avec raccourci Aujourd'hui */}
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800/80 rounded-xl px-2 py-1.5 shadow-inner">
          <button
            onClick={handlePrevDay}
            className="p-1.5 text-slate-400 hover:text-white active:scale-90 transition-transform rounded-lg hover:bg-slate-800"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
            <button
              onClick={handleResetToday}
              className="text-xs font-semibold text-slate-200 hover:text-white capitalize flex items-center gap-1.5"
            >
              <span>{formatFriendlyDate(selectedDate)}</span>
              {!isToday && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Aujourd'hui
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 text-slate-400 hover:text-white active:scale-90 transition-transform rounded-lg hover:bg-slate-800"
            aria-label="Jour suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
