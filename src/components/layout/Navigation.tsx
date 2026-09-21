import React from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Calculator, 
  Settings 
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'profile' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenNewMeal: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenNewMeal
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/80 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 transition-all">
      <div className="max-w-md mx-auto px-6 flex items-center justify-between">
        {/* Onglet Dashboard */}
        <button
          onClick={() => onChangeTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-emerald-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Semaine</span>
        </button>

        {/* Bouton Central Surélevé : Nouveau Repas (Photo / Texte) */}
        <div className="-mt-6">
          <button
            onClick={onOpenNewMeal}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/35 flex items-center justify-center hover:scale-105 active:scale-95 transition-all focus:outline-none border-2 border-slate-950"
            aria-label="Ajouter un repas"
          >
            <Plus className="w-7 h-7 stroke-[2.6]" />
          </button>
        </div>

        {/* Onglet Objectifs / Calculateur */}
        <button
          onClick={() => onChangeTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'profile'
              ? 'text-emerald-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px]">Objectifs</span>
        </button>

        {/* Onglet Réglages */}
        <button
          onClick={() => onChangeTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'settings'
              ? 'text-emerald-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Réglages</span>
        </button>
      </div>
    </nav>
  );
};
