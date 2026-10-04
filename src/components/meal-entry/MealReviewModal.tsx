import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  Coffee, 
  Moon, 
  Apple,
  Star
} from 'lucide-react';
import { Ingredient, Meal, MealType } from '../../types/nutrition';
import { 
  enrichIngredientWithBase100g, 
  recalculateIngredientForWeight, 
  GeminiNutritionResponse 
} from '../../services/gemini';
import { useNutrition } from '../../context/NutritionContext';
import { formatDateYMD } from '../../utils/dateUtils';
import { AutocompleteSuggestions } from './AutocompleteSuggestions';

interface MealReviewModalProps {
  isOpen: boolean;
  initialData?: GeminiNutritionResponse | null;
  existingMeal?: Meal | null; // Si on modifie un repas existant
  source?: 'photo' | 'text' | 'manual';
  onClose: () => void;
  onSave: (meal: Omit<Meal, 'id' | 'timestamp'> & { id?: string }) => void;
}

export const MealReviewModal: React.FC<MealReviewModalProps> = ({
  isOpen,
  initialData,
  existingMeal,
  source = 'text',
  onClose,
  onSave
}) => {
  const { 
    selectedDate, 
    toggleFavoriteMeal, 
    isFavoriteMeal, 
    toggleFavoriteFood, 
    isFavoriteFood 
  } = useNutrition();

  // État local des données du repas
  const [mealName, setMealName] = useState<string>(() => {
    return existingMeal?.repas_nom || initialData?.repas_nom || 'Mon Repas';
  });

  const [mealType, setMealType] = useState<MealType>(() => {
    if (existingMeal) return existingMeal.mealType;
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 18) return 'snack';
    return 'dinner';
  });

  const [mealDate, setMealDate] = useState<string>(() => {
    return existingMeal?.date || selectedDate || formatDateYMD(new Date());
  });

  const [mealTime, setMealTime] = useState<string>(() => {
    if (existingMeal?.time) return existingMeal.time;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  // Liste des ingrédients avec base100g enrichie pour ajustements proportionnels
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    if (existingMeal?.ingredients) {
      return existingMeal.ingredients.map((ing) => enrichIngredientWithBase100g(ing));
    }
    if (initialData?.ingredients) {
      return initialData.ingredients.map((ing) => enrichIngredientWithBase100g(ing));
    }
    return [];
  });

  // Nouvel ingrédient manuel
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIngName, setNewIngName] = useState('');
  const [newIngWeight, setNewIngWeight] = useState(100);
  const [newIngCals, setNewIngCals] = useState(150);
  const [newIngProt, setNewIngProt] = useState(10);
  const [newIngCarbs, setNewIngCarbs] = useState(15);
  const [newIngFats, setNewIngFats] = useState(5);
  const [newIngFibres, setNewIngFibres] = useState(2);
  const [newIngSodium, setNewIngSodium] = useState(50);
  const [saveNewIngAsFav, setSaveNewIngAsFav] = useState(false);

  // État d'affichage des micronutriments (Fibres & Sodium) masqués par défaut
  const [expandedMicros, setExpandedMicros] = useState<Record<string, boolean>>({});

  // Modification directe des macros (Glucides, Protéines, Lipides, Fibres, Sodium) d'un aliment
  const handleUpdateIngredientMacro = (
    id: string,
    field: 'proteines_g' | 'glucides_g' | 'lipides_g' | 'fibres_g' | 'sodium_mg',
    value: number
  ) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        const updated = {
          ...ing,
          [field]: Math.max(0, Number(value) || 0)
        };
        // Recalcul dynamique des calories si P, G ou L change
        if (field === 'proteines_g' || field === 'glucides_g' || field === 'lipides_g') {
          updated.calories = Math.round(updated.proteines_g * 4 + updated.glucides_g * 4 + updated.lipides_g * 9);
        }
        // Mise à jour de la base 100g proportionnelle
        const factor = 100 / Math.max(updated.poids_estime_g, 1);
        updated.basePer100g = {
          calories: Math.round(updated.calories * factor),
          proteines_g: Number((updated.proteines_g * factor).toFixed(2)),
          glucides_g: Number((updated.glucides_g * factor).toFixed(2)),
          lipides_g: Number((updated.lipides_g * factor).toFixed(2)),
          fibres_g: Number(((updated.fibres_g || 0) * factor).toFixed(2)),
          sodium_mg: Math.round((updated.sodium_mg || 0) * factor),
        };
        return updated;
      })
    );
  };

  // Synchronisation dynamique quand un nouveau repas est analysé ou ouvert
  useEffect(() => {
    if (existingMeal) {
      setMealName(existingMeal.repas_nom || 'Mon Repas');
      setMealType(existingMeal.mealType || 'lunch');
      setMealDate(existingMeal.date || selectedDate || formatDateYMD(new Date()));
      setMealTime(existingMeal.time || '12:00');
      setIngredients(existingMeal.ingredients.map((ing) => enrichIngredientWithBase100g(ing)));
    } else if (initialData) {
      setMealName(initialData.repas_nom || 'Mon Repas');
      const hour = new Date().getHours();
      setMealType(hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 18 ? 'snack' : 'dinner');
      setMealDate(selectedDate || formatDateYMD(new Date()));
      const now = new Date();
      setMealTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setIngredients((initialData.ingredients || []).map((ing) => enrichIngredientWithBase100g(ing)));
    }
  }, [isOpen, initialData, existingMeal, selectedDate]);

  // Recalcul instantané des totaux
  const totals = useMemo(() => {
    let cals = 0, p = 0, g = 0, l = 0, fib = 0, sod = 0;
    for (const ing of ingredients) {
      cals += ing.calories || 0;
      p += ing.proteines_g || 0;
      g += ing.glucides_g || 0;
      l += ing.lipides_g || 0;
      fib += ing.fibres_g || 0;
      sod += ing.sodium_mg || 0;
    }
    return {
      calories: Math.round(cals),
      proteines: Number(p.toFixed(1)),
      glucides: Number(g.toFixed(1)),
      lipides: Number(l.toFixed(1)),
      fibres: Number(fib.toFixed(1)),
      sodium: Math.round(sod)
    };
  }, [ingredients]);

  if (!isOpen) return null;

  // Ajustement rapide de grammage (+/- 10g ou 25g, ou via curseur slider)
  const handleWeightChange = (id: string, newWeight: number) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id === id) {
          return recalculateIngredientForWeight(ing, Math.max(0, newWeight));
        }
        return ing;
      })
    );
  };

  const handleStepWeight = (id: string, delta: number) => {
    const ing = ingredients.find((i) => i.id === id);
    if (!ing) return;
    handleWeightChange(id, ing.poids_estime_g + delta);
  };

  const handleDeleteIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleMicros = (id: string) => {
    setExpandedMicros((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddManualIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) return;

    const newIng = enrichIngredientWithBase100g({
      nom: newIngName.trim(),
      poids_estime_g: Number(newIngWeight) || 100,
      calories: Number(newIngCals) || 0,
      proteines_g: Number(newIngProt) || 0,
      glucides_g: Number(newIngCarbs) || 0,
      lipides_g: Number(newIngFats) || 0,
      fibres_g: Number(newIngFibres) || 0,
      sodium_mg: Number(newIngSodium) || 0
    });

    setIngredients((prev) => [...prev, newIng]);

    if (saveNewIngAsFav) {
      toggleFavoriteFood({
        nom: newIng.nom,
        poids_g: newIng.poids_estime_g,
        calories: newIng.calories,
        proteines_g: newIng.proteines_g,
        glucides_g: newIng.glucides_g,
        lipides_g: newIng.lipides_g,
        fibres_g: newIng.fibres_g,
        sodium_mg: newIng.sodium_mg,
        basePer100g: newIng.basePer100g
      });
    }

    setNewIngName('');
    setNewIngWeight(100);
    setNewIngCals(150);
    setNewIngProt(10);
    setNewIngCarbs(15);
    setNewIngFats(5);
    setNewIngFibres(2);
    setNewIngSodium(50);
    setSaveNewIngAsFav(false);
    setShowAddModal(false);
  };

  const handleSaveMeal = () => {
    if (ingredients.length === 0) {
      alert("Veuillez conserver ou ajouter au moins un ingrédient.");
      return;
    }

    onSave({
      id: existingMeal?.id,
      repas_nom: mealName.trim() || "Repas",
      mealType,
      date: mealDate,
      time: mealTime,
      ingredients,
      confiance: initialData?.confiance || 'haute',
      source: existingMeal?.source || source
    });
  };

  const mealTypes: Array<{ type: MealType; label: string; icon: any }> = [
    { type: 'breakfast', label: 'Matin', icon: Coffee },
    { type: 'lunch', label: 'Midi', icon: Utensils },
    { type: 'dinner', label: 'Soir', icon: Moon },
    { type: 'snack', label: 'Snack', icon: Apple },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden pb-[max(16px,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée iOS */}
        <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* En-tête Fixe : Validation & Ajustement */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Ajustement & Validation
              </h3>
              <p className="text-[10px] text-slate-400">
                Ajustez les curseurs à l'œil sans taper au clavier
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

        {/* Zone de défilement central */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Nom du plat & Type de repas */}
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Nom du plat
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toggleFavoriteMeal({
                      nom: mealName.trim() || 'Mon Repas',
                      mealType,
                      ingredients,
                      totalCalories: totals.calories
                    })
                  }
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 ${
                    isFavoriteMeal(mealName)
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-amber-300 bg-slate-950 border border-slate-800'
                  }`}
                  title="Mémoriser ou retirer ce plat complet de vos favoris"
                >
                  <Star
                    className={`w-3 h-3 ${
                      isFavoriteMeal(mealName) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{isFavoriteMeal(mealName) ? 'Plat favori ⭐' : 'Mettre en favori'}</span>
                </button>
              </div>

              <input
                type="text"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              />

              <AutocompleteSuggestions
                query={mealName}
                mode="meal"
                className="mt-2"
                onSelectMeal={(favMeal) => {
                  setMealName(favMeal.nom);
                  if (favMeal.mealType) setMealType(favMeal.mealType);
                  if (favMeal.ingredients && favMeal.ingredients.length > 0) {
                    setIngredients(favMeal.ingredients.map((ing) => enrichIngredientWithBase100g(ing)));
                  }
                }}
              />
            </div>

            {/* Type de repas */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Moment du repas
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {mealTypes.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMealType(type)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      mealType === type
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Heure */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Date</label>
                <input
                  type="date"
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Heure</label>
                <input
                  type="time"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Bandeau Totaux Dynamiques en direct */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-4 rounded-2xl border border-emerald-500/30 shadow-lg shadow-emerald-500/5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Total estimé :</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{totals.calories}</span>
                <span className="text-xs font-bold text-emerald-400">kcal</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/80">
              <div className="bg-slate-950/60 p-1.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-medium">Protéines</span>
                <span className="text-xs font-bold text-sky-400">{totals.proteines}g</span>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-medium">Glucides</span>
                <span className="text-xs font-bold text-emerald-400">{totals.glucides}g</span>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-medium">Lipides</span>
                <span className="text-xs font-bold text-amber-400">{totals.lipides}g</span>
              </div>
            </div>
          </div>

          {/* Liste des ingrédients avec curseurs et boutons rapides +/- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Aliments détectés ({ingredients.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter un aliment
              </button>
            </div>

            {ingredients.map((ing) => {
              const isMicroOpen = !!expandedMicros[ing.id];

              return (
                <div
                  key={ing.id}
                  className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-sm space-y-2.5 transition-all"
                >
                  {/* Ligne Ingrédient : Nom, Calories & Bouton Supprimer */}
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={ing.nom}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setIngredients((prev) =>
                          prev.map((item) => (item.id === ing.id ? { ...item, nom: newName } : item))
                        );
                      }}
                      className="bg-transparent text-xs font-bold text-white focus:outline-none border-b border-transparent focus:border-slate-700 pb-0.5 flex-1"
                    />

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-black text-white mr-1">
                        {ing.calories} <span className="text-[10px] text-slate-400 font-normal">kcal</span>
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          toggleFavoriteFood({
                            nom: ing.nom,
                            poids_g: ing.poids_estime_g,
                            calories: ing.calories,
                            proteines_g: ing.proteines_g,
                            glucides_g: ing.glucides_g,
                            lipides_g: ing.lipides_g,
                            fibres_g: ing.fibres_g,
                            sodium_mg: ing.sodium_mg,
                            basePer100g: ing.basePer100g
                          })
                        }
                        className={`p-1 rounded transition-colors active:scale-95 ${
                          isFavoriteFood(ing.nom)
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-500 hover:text-amber-400'
                        }`}
                        title={
                          isFavoriteFood(ing.nom)
                            ? 'Aliment favori ⭐ (cliquer pour retirer)'
                            : 'Ajouter cet aliment aux favoris'
                        }
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFavoriteFood(ing.nom) ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => handleDeleteIngredient(ing.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded"
                        title="Retirer cet ingrédient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contrôles de Grammage : Curseur Slider Tactile + Boutons Rapides +/- */}
                  <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">Quantité :</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-emerald-400">
                          {ing.poids_estime_g}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">g</span>
                      </div>
                    </div>

                    {/* Curseur Slider HTML5 */}
                    <input
                      type="range"
                      min={0}
                      max={500}
                      step={5}
                      value={ing.poids_estime_g}
                      onChange={(e) => handleWeightChange(ing.id, Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />

                    {/* Boutons d'ajustement pas à pas rapides -25g / -10g / +10g / +25g */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStepWeight(ing.id, -25)}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 active:scale-95 transition-all"
                        >
                          -25g
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepWeight(ing.id, -10)}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 active:scale-95 transition-all"
                        >
                          -10g
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStepWeight(ing.id, +10)}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 active:scale-95 transition-all"
                        >
                          +10g
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepWeight(ing.id, +25)}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 active:scale-95 transition-all"
                        >
                          +25g
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ligne Macronutriments de l'ingrédient (P / G / L) */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">
                      P: <strong className="text-sky-400">{ing.proteines_g}g</strong>
                    </span>
                    <span className="text-slate-400">
                      G: <strong className="text-emerald-400">{ing.glucides_g}g</strong>
                    </span>
                    <span className="text-slate-400">
                      L: <strong className="text-amber-400">{ing.lipides_g}g</strong>
                    </span>

                    {/* Bouton "Plus" pour afficher/masquer les micronutriments (Fibres & Sodium) */}
                    <button
                      type="button"
                      onClick={() => toggleMicros(ing.id)}
                      className="text-[10px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 ml-2 transition-colors"
                    >
                      <span>{isMicroOpen ? 'Moins' : '+ Plus'}</span>
                      {isMicroOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Tiroir d'ajustement direct des macros (Glucides, Protéines, Lipides, Fibres, Sodium) */}
                  {isMicroOpen && (
                    <div className="mt-2.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                          Ajuster les macros de cet aliment :
                        </span>
                        <span className="text-[9px] text-emerald-400">
                          Recalcul auto des calories
                        </span>
                      </div>

                      {/* Édition P / G / L */}
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                          <label className="text-[9px] text-sky-400 font-bold block mb-0.5">Protéines (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={ing.proteines_g}
                            onChange={(e) => handleUpdateIngredientMacro(ing.id, 'proteines_g', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded py-0.5 px-1 text-xs font-bold text-center text-white focus:outline-none focus:border-sky-400"
                          />
                        </div>

                        <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                          <label className="text-[9px] text-emerald-400 font-bold block mb-0.5">Glucides (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={ing.glucides_g}
                            onChange={(e) => handleUpdateIngredientMacro(ing.id, 'glucides_g', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded py-0.5 px-1 text-xs font-bold text-center text-white focus:outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                          <label className="text-[9px] text-amber-400 font-bold block mb-0.5">Lipides (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={ing.lipides_g}
                            onChange={(e) => handleUpdateIngredientMacro(ing.id, 'lipides_g', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded py-0.5 px-1 text-xs font-bold text-center text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Édition Fibres & Sodium */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-teal-400 font-medium">Fibres (g):</span>
                          <input
                            type="number"
                            step="0.1"
                            value={ing.fibres_g || 0}
                            onChange={(e) => handleUpdateIngredientMacro(ing.id, 'fibres_g', Number(e.target.value))}
                            className="w-14 bg-slate-950 border border-slate-800 rounded py-0.5 px-1 text-xs font-bold text-right text-white focus:outline-none focus:border-teal-400"
                          />
                        </div>

                        <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-violet-400 font-medium">Sodium (mg):</span>
                          <input
                            type="number"
                            value={ing.sodium_mg || 0}
                            onChange={(e) => handleUpdateIngredientMacro(ing.id, 'sodium_mg', Number(e.target.value))}
                            className="w-14 bg-slate-950 border border-slate-800 rounded py-0.5 px-1 text-xs font-bold text-right text-white focus:outline-none focus:border-violet-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modale d'ajout manuel d'aliment avec contrôle complet des glucides et macros */}
          {showAddModal && (
            <div className="p-4 bg-slate-900 border border-emerald-500/40 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Ajouter un ingrédient sur-mesure</span>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                    Nom de l'aliment
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Chocolat noir 70%, Noix, Miel..."
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />

                  <AutocompleteSuggestions
                    query={newIngName}
                    mode="food"
                    alwaysShowChipsIfEmpty={true}
                    className="mt-2"
                    onSelectFood={(food) => {
                      setNewIngName(food.nom);
                      setNewIngWeight(food.poids_g);
                      setNewIngCals(food.calories);
                      setNewIngProt(food.proteines_g);
                      setNewIngCarbs(food.glucides_g);
                      setNewIngFats(food.lipides_g);
                      setNewIngFibres(food.fibres_g || 0);
                      setNewIngSodium(food.sodium_mg || 0);
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Poids (g)</label>
                    <input
                      type="number"
                      value={newIngWeight}
                      onChange={(e) => setNewIngWeight(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-semibold text-slate-400">Calories (kcal)</label>
                      <button
                        type="button"
                        onClick={() => setNewIngCals(Math.round(newIngProt * 4 + newIngCarbs * 4 + newIngFats * 9))}
                        className="text-[9px] text-emerald-400 hover:text-emerald-300 font-semibold"
                        title="Calculer d'après P/G/L"
                      >
                        Auto P/G/L
                      </button>
                    </div>
                    <input
                      type="number"
                      value={newIngCals}
                      onChange={(e) => setNewIngCals(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Saisie personnalisée Protéines, Glucides, Lipides */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Macronutriments (g)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <label className="text-[10px] text-sky-400 font-bold block mb-0.5">Protéines</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newIngProt}
                        onChange={(e) => setNewIngProt(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-1 text-xs font-bold text-center text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <label className="text-[10px] text-emerald-400 font-bold block mb-0.5">Glucides</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newIngCarbs}
                        onChange={(e) => setNewIngCarbs(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-1 text-xs font-bold text-center text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <label className="text-[10px] text-amber-400 font-bold block mb-0.5">Lipides</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newIngFats}
                        onChange={(e) => setNewIngFats(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-1 text-xs font-bold text-center text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Fibres et Sodium */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Fibres (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newIngFibres}
                      onChange={(e) => setNewIngFibres(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Sodium (mg)</label>
                    <input
                      type="number"
                      value={newIngSodium}
                      onChange={(e) => setNewIngSodium(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Option Favori */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveNewIngAsFav}
                    onChange={(e) => setSaveNewIngAsFav(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Mémoriser cet aliment dans mes favoris
                  </span>
                </label>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleAddManualIngredient}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs rounded-xl shadow active:scale-95 transition-all"
                  >
                    Ajouter au repas
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied Fixe : Bouton Enregistrer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950">
          <button
            type="button"
            onClick={handleSaveMeal}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Enregistrer dans mon journal ({totals.calories} kcal)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
