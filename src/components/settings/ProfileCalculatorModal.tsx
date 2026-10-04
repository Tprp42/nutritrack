import React, { useState, useMemo } from 'react';
import { 
  X, 
  Check, 
  Target, 
  TrendingDown, 
  TrendingUp, 
  Minus,
  Sparkles,
  Info
} from 'lucide-react';
import { UserProfile, Gender, ActivityLevel, FitnessGoal } from '../../types/nutrition';
import { calculateProfileNutrition } from '../../services/profileCalculator';
import { useNutrition } from '../../context/NutritionContext';

interface ProfileCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileCalculatorModal: React.FC<ProfileCalculatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { settings, updateSettings } = useNutrition();

  const [weightKg, setWeightKg] = useState<number>(settings.profile?.weightKg || 75);
  const [heightCm, setHeightCm] = useState<number>(settings.profile?.heightCm || 178);
  const [age, setAge] = useState<number>(settings.profile?.age || 28);
  const [gender, setGender] = useState<Gender>(settings.profile?.gender || 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(settings.profile?.activityLevel || 'moderate');
  const [goal, setGoal] = useState<FitnessGoal>(settings.profile?.goal || 'maintenance');

  const currentProfile: UserProfile = useMemo(() => ({
    weightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    goal
  }), [weightKg, heightCm, age, gender, activityLevel, goal]);

  const calculation = useMemo(() => {
    return calculateProfileNutrition(currentProfile);
  }, [currentProfile]);

  if (!isOpen) return null;

  const handleApply = () => {
    updateSettings({
      profile: currentProfile,
      weeklyCalorieBudget: calculation.recommendedWeeklyCalories,
      customDailyTarget: calculation.recommendedDailyCalories
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden pb-[max(16px,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée iOS */}
        <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* En-tête */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Calculateur d'Objectifs selon le Profil
              </h3>
              <p className="text-[10px] text-slate-400">
                Calculez vos besoins sur-mesure (Perte de poids vs Prise de masse)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilant */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Choix de l'Objectif Principal */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              1. Votre Objectif Actuel
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGoal('fat_loss')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  goal === 'fat_loss'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingDown className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                <span className="text-xs font-bold block">Perte de poids</span>
                <span className="text-[10px] text-slate-400">Sèche & déficit</span>
              </button>

              <button
                type="button"
                onClick={() => setGoal('maintenance')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  goal === 'maintenance'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Minus className="w-5 h-5 mx-auto mb-1 text-teal-400" />
                <span className="text-xs font-bold block">Maintien</span>
                <span className="text-[10px] text-slate-400">Équilibre stable</span>
              </button>

              <button
                type="button"
                onClick={() => setGoal('muscle_gain')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  goal === 'muscle_gain'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                <span className="text-xs font-bold block">Prise de masse</span>
                <span className="text-[10px] text-slate-400">Muscle & surplus</span>
              </button>
            </div>
          </div>

          {/* Morphologie & Paramètres Physiques */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 block">
              2. Votre Profil Physique
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Poids actuel (kg)
                </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Math.max(30, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Taille (cm)
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Math.max(100, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Âge
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Math.max(14, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Sexe
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-1 rounded-lg text-xs font-bold transition-all ${
                      gender === 'male' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Homme
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-1 rounded-lg text-xs font-bold transition-all ${
                      gender === 'female' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Femme
                  </button>
                </div>
              </div>
            </div>

            {/* Niveau d'activité */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Niveau d'activité physique quotidienne
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="sedentary">Sédentaire (travail de bureau, peu d'exercice)</option>
                <option value="light">Légèrement actif (1 à 3 séances/semaine)</option>
                <option value="moderate">Modérément actif (3 à 5 séances/semaine)</option>
                <option value="very_active">Très actif (sport quotidien intense)</option>
              </select>
            </div>
          </div>

          {/* Résultats du Calcul Scientifique */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-2xl border border-emerald-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Recommandation Personnalisée
              </span>
              <span className="text-[11px] text-slate-400">
                TDEE : {calculation.tdee} kcal
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center py-2 border-y border-slate-800/80">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">
                  Cible journalière
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-white">
                    {calculation.recommendedDailyCalories}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">kcal/j</span>
                </div>
              </div>

              <div className="border-l border-slate-800/80 pl-3">
                <span className="text-[11px] text-slate-400 block font-medium">
                  Budget hebdomadaire
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-white">
                    {calculation.recommendedWeeklyCalories.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">kcal/sem.</span>
                </div>
              </div>
            </div>

            {/* Répartition Recommandée des Macronutriments */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                Macronutriments recommandés :
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Protéines</span>
                  <span className="text-xs font-bold text-sky-400">
                    {calculation.macroTargets.proteins_g}g
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    ({(calculation.macroTargets.proteins_g / weightKg).toFixed(1)}g/kg)
                  </span>
                </div>

                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Glucides</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {calculation.macroTargets.carbs_g}g
                  </span>
                  <span className="text-[9px] text-slate-500 block">Énergie</span>
                </div>

                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Lipides</span>
                  <span className="text-xs font-bold text-amber-400">
                    {calculation.macroTargets.fats_g}g
                  </span>
                  <span className="text-[9px] text-slate-500 block">Santé hormone</span>
                </div>
              </div>
            </div>

            {/* Explication contextuelle */}
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
              <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p>{calculation.explanation}</p>
            </div>
          </div>
        </div>

        {/* Pied Fixe : Bouton Appliquer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950">
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Appliquer ce profil à mon tableau de bord</span>
          </button>
        </div>
      </div>
    </div>
  );
};
