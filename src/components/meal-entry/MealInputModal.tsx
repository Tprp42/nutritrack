import React, { useState } from 'react';
import { X, Camera, MessageSquareText, PenTool, Sparkles } from 'lucide-react';
import { PhotoCapture } from './PhotoCapture';
import { TextCapture } from './TextCapture';
import { ManualMealCapture } from './ManualMealCapture';
import { GeminiNutritionResponse, getMockMealDemo } from '../../services/gemini';

interface MealInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: GeminiNutritionResponse, source: 'photo' | 'text' | 'manual') => void;
  onOpenSettings: () => void;
}

export const MealInputModal: React.FC<MealInputModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenSettings
}) => {
  const [activeMode, setActiveMode] = useState<'photo' | 'text' | 'manual'>('photo');

  if (!isOpen) return null;

  const handleUseDemo = () => {
    const mock = getMockMealDemo();
    onSuccess(mock, 'manual');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto pb-[max(20px,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée de glissement iOS */}
        <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-4 sm:hidden" />

        {/* En-tête */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Ajouter un Repas
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeMode === 'manual' ? 'Saisie 100% manuelle sans IA' : 'Estimation instantanée par IA multimodale'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélecteur de mode à 3 onglets : Photo vs Texte vs Manuel */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 mb-4">
          <button
            onClick={() => setActiveMode('photo')}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'photo'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Photo</span>
          </button>

          <button
            onClick={() => setActiveMode('text')}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'text'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            <span>Texte IA</span>
          </button>

          <button
            onClick={() => setActiveMode('manual')}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'manual'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Manuel</span>
          </button>
        </div>

        {/* Contenu selon le mode sélectionné */}
        {activeMode === 'photo' && (
          <PhotoCapture onSuccess={onSuccess} onOpenSettings={onOpenSettings} />
        )}
        {activeMode === 'text' && (
          <TextCapture onSuccess={onSuccess} onOpenSettings={onOpenSettings} />
        )}
        {activeMode === 'manual' && (
          <ManualMealCapture onSuccessReview={onSuccess} onClose={onClose} />
        )}

        {/* Bouton d'essai rapide avec exemple pré-calculé */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={handleUseDemo}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
          >
            ✨ Tester immédiatement avec un repas d'exemple (sans clé API)
          </button>
        </div>
      </div>
    </div>
  );
};
