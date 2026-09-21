import React, { useState } from 'react';
import { Check, Coffee, Utensils, Moon, Apple, Calculator, Star } from 'lucide-react';
import { Meal, MealType, FavoriteFood, FavoriteMeal } from '../../types/nutrition';
import { enrichIngredientWithBase100g, GeminiNutritionResponse } from '../../services/gemini';
import { useNutrition } from '../../context/NutritionContext';
import { formatDateYMD } from '../../utils/dateUtils';
import { AutocompleteSuggestions } from './AutocompleteSuggestions';

interface ManualMealCaptureProps {
  onSuccessReview: (data: GeminiNutritionResponse, source: 'manual') => void;
  onDirectSave?: (meal: Omit<Meal, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}

interface QuickPreset {
  label: string;
  nom: string;
  poids_g: number;
  calories: number;
  p: number;
  g: number;
  l: number;
  fib: number;
  sod: number;
}

const QUICK_PRESETS: QuickPreset[] = [
  { label: "🍫 2 carrés de chocolat noir", nom: "Chocolat noir 70%", poids_g: 20, calories: 115, p: 1.6, g: 9.2, l: 8.4, fib: 2.1, sod: 4 },
  { label: "🍎 1 pomme moyenne", nom: "Pomme fraîche", poids_g: 150, calories: 78, p: 0.4, g: 19.5, l: 0.3, fib: 3.6, sod: 2 },
  { label: "🍌 1 banane", nom: "Banane mûre", poids_g: 120, calories: 107, p: 1.3, g: 27.4, l: 0.4, fib: 3.1, sod: 1 },
  { label: "🥜 Poignée d'amandes (30g)", nom: "Amandes entières", poids_g: 30, calories: 175, p: 6.3, g: 6.5, l: 15.0, fib: 3.5, sod: 1 },
  { label: "☕ Café au lait", nom: "Café au lait demi-écrémé", poids_g: 200, calories: 65, p: 4.2, g: 6.0, l: 2.5, fib: 0, sod: 55 },
  { label: "🥛 Fromage blanc 0% (200g)", nom: "Fromage blanc 0%", poids_g: 200, calories: 96, p: 15.0, g: 8.0, l: 0.4, fib: 0, sod: 80 },
];

export const ManualMealCapture: React.FC<ManualMealCaptureProps> = ({
  onSuccessReview,
  onClose
}) => {
  const { 
    selectedDate, 
    addMeal, 
    favorites, 
    toggleFavoriteFood, 
    isFavoriteFood 
  } = useNutrition();

  const [mealName, setMealName] = useState('');
  const [saveAsFav, setSaveAsFav] = useState(false);
  const [mealType, setMealType] = useState<MealType>(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 18) return 'snack';
    return 'dinner';
  });

  const [foodName, setFoodName] = useState('');
  const [weightG, setWeightG] = useState(20);
  const [calories, setCalories] = useState(115);
  const [proteinsG, setProteinsG] = useState(1.6);
  const [carbsG, setCarbsG] = useState(9.2);
  const [fatsG, setFatsG] = useState(8.4);
  const [fibresG, setFibresG] = useState(2.0);
  const [sodiumMg, setSodiumMg] = useState(4);

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Appliquer un aliment favori
  const applyFavoriteFood = (food: FavoriteFood) => {
    setFoodName(food.nom);
    if (!mealName) setMealName(food.nom);
    setWeightG(food.poids_g);
    setCalories(food.calories);
    setProteinsG(food.proteines_g);
    setCarbsG(food.glucides_g);
    setFatsG(food.lipides_g);
    setFibresG(food.fibres_g || 0);
    setSodiumMg(food.sodium_mg || 0);
  };

  // Appliquer un repas complet favori
  const applyFavoriteMeal = (meal: FavoriteMeal) => {
    setMealName(meal.nom);
    if (meal.mealType) setMealType(meal.mealType);
    if (meal.ingredients.length === 1) {
      applyFavoriteFood({
        id: meal.ingredients[0].id,
        nom: meal.ingredients[0].nom,
        poids_g: meal.ingredients[0].poids_estime_g,
        calories: meal.ingredients[0].calories,
        proteines_g: meal.ingredients[0].proteines_g,
        glucides_g: meal.ingredients[0].glucides_g,
        lipides_g: meal.ingredients[0].lipides_g,
        fibres_g: meal.ingredients[0].fibres_g,
        sodium_mg: meal.ingredients[0].sodium_mg,
        basePer100g: meal.ingredients[0].basePer100g,
        createdAt: Date.now()
      });
    } else if (meal.ingredients.length > 1) {
      onSuccessReview({
        repas_nom: meal.nom,
        ingredients: meal.ingredients,
        confiance: 'haute'
      }, 'manual');
    }
  };

  // Appliquer un preset rapide
  const applyPreset = (preset: QuickPreset) => {
    setMealName(preset.label.replace(/^[^\s]+\s/, ''));
    setFoodName(preset.nom);
    setWeightG(preset.poids_g);
    setCalories(preset.calories);
    setProteinsG(preset.p);
    setCarbsG(preset.g);
    setFatsG(preset.l);
    setFibresG(preset.fib);
    setSodiumMg(preset.sod);
  };

  // Calcul automatique Atwater (P*4 + G*4 + L*9)
  const autoCalculateCalories = () => {
    const calculated = Math.round(proteinsG * 4 + carbsG * 4 + fatsG * 9);
    setCalories(calculated);
  };

  // Enregistrement direct sans passer par l'écran d'ajustement
  const handleDirectSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMealName = mealName.trim() || foodName.trim() || "Collation";
    const finalFoodName = foodName.trim() || finalMealName;

    const ing = enrichIngredientWithBase100g({
      nom: finalFoodName,
      poids_estime_g: Number(weightG) || 100,
      calories: Number(calories) || 0,
      proteines_g: Number(proteinsG) || 0,
      glucides_g: Number(carbsG) || 0,
      lipides_g: Number(fatsG) || 0,
      fibres_g: Number(fibresG) || 0,
      sodium_mg: Number(sodiumMg) || 0
    });

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (saveAsFav) {
      toggleFavoriteFood({
        nom: finalFoodName,
        poids_g: ing.poids_estime_g,
        calories: ing.calories,
        proteines_g: ing.proteines_g,
        glucides_g: ing.glucides_g,
        lipides_g: ing.lipides_g,
        fibres_g: ing.fibres_g,
        sodium_mg: ing.sodium_mg,
        basePer100g: ing.basePer100g
      });
    }

    addMeal({
      repas_nom: finalMealName,
      mealType,
      date: selectedDate || formatDateYMD(now),
      time: timeStr,
      ingredients: [ing],
      confiance: 'haute',
      source: 'manual'
    });

    onClose();
  };

  // Passer par l'écran d'ajustement pour peaufiner
  const handleOpenReview = () => {
    const finalMealName = mealName.trim() || foodName.trim() || "Repas Manuel";
    const finalFoodName = foodName.trim() || finalMealName;

    const responseData: GeminiNutritionResponse = {
      repas_nom: finalMealName,
      ingredients: [
        {
          nom: finalFoodName,
          poids_estime_g: Number(weightG) || 100,
          calories: Number(calories) || 0,
          proteines_g: Number(proteinsG) || 0,
          glucides_g: Number(carbsG) || 0,
          lipides_g: Number(fatsG) || 0,
          fibres_g: Number(fibresG) || 0,
          sodium_mg: Number(sodiumMg) || 0
        }
      ],
      confiance: 'haute'
    };

    onSuccessReview(responseData, 'manual');
  };

  const mealTypes: Array<{ type: MealType; label: string; icon: any }> = [
    { type: 'breakfast', label: 'Matin', icon: Coffee },
    { type: 'lunch', label: 'Midi', icon: Utensils },
    { type: 'dinner', label: 'Soir', icon: Moon },
    { type: 'snack', label: 'Snack', icon: Apple },
  ];

  return (
    <div className="space-y-4">
      {/* Favoris rapides enregistrés */}
      {(favorites.foods.length > 0 || favorites.meals.length > 0) && (
        <div className="bg-amber-500/5 p-2.5 rounded-2xl border border-amber-500/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>Vos favoris sauvegardés :</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {favorites.meals.map((meal) => (
              <button
                key={meal.id}
                type="button"
                onClick={() => applyFavoriteMeal(meal)}
                className="text-[11px] py-1 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:text-amber-100 transition-all active:scale-95 font-semibold flex items-center gap-1"
              >
                <span>⭐ {meal.nom}</span>
                <span className="text-[10px] text-amber-300/80 font-normal">({meal.totalCalories} kcal)</span>
              </button>
            ))}
            {favorites.foods.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => applyFavoriteFood(food)}
                className="text-[11px] py-1 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all active:scale-95 font-semibold flex items-center gap-1"
              >
                <span>⭐ {food.nom}</span>
                <span className="text-[10px] text-emerald-400 font-normal">({food.calories} kcal)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Presets rapides en 1 clic */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
          Exemples fréquents (1 clic) :
        </label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(preset)}
              className="text-[11px] py-1 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire de saisie manuelle */}
      <form onSubmit={handleDirectSave} className="space-y-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
        {/* Moment du repas */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-1">
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
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nom du repas / Aliment */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                Nom du plat
              </label>
              <input
                type="text"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="Ex: 2 carrés de chocolat, Goûter..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                Aliment
              </label>
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="Ex: Chocolat noir 70%"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <AutocompleteSuggestions
            query={foodName || mealName}
            onSelectFood={(food) => applyFavoriteFood(food)}
            onSelectMeal={(meal) => applyFavoriteMeal(meal)}
          />
        </div>

        {/* Quantité & Calories */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
              Poids (g)
            </label>
            <input
              type="number"
              value={weightG}
              onChange={(e) => setWeightG(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="block text-[10px] font-semibold text-slate-400">
                Calories (kcal)
              </label>
              <button
                type="button"
                onClick={autoCalculateCalories}
                title="Calculer depuis P/G/L (P*4 + G*4 + L*9)"
                className="text-[9px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5"
              >
                <Calculator className="w-2.5 h-2.5" /> Auto P/G/L
              </button>
            </div>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Macronutriments Personnalisables (Protéines, Glucides, Lipides) */}
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Macronutriments précis (modifiables) :
          </span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] font-semibold text-sky-400 block mb-1">
                Protéines (g)
              </span>
              <input
                type="number"
                step="0.1"
                value={proteinsG}
                onChange={(e) => setProteinsG(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-xs font-bold text-center text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] font-semibold text-emerald-400 block mb-1">
                Glucides (g)
              </span>
              <input
                type="number"
                step="0.1"
                value={carbsG}
                onChange={(e) => setCarbsG(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-xs font-bold text-center text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] font-semibold text-amber-400 block mb-1">
                Lipides (g)
              </span>
              <input
                type="number"
                step="0.1"
                value={fatsG}
                onChange={(e) => setFatsG(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-xs font-bold text-center text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Micronutriments optionnels (Fibres, Sodium) */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[10px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <span>{showAdvanced ? 'Masquer fibres et sodium' : '+ Préciser fibres et sodium'}</span>
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60 animate-fadeIn">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  Fibres (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={fibresG}
                  onChange={(e) => setFibresG(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  Sodium (mg)
                </label>
                <input
                  type="number"
                  value={sodiumMg}
                  onChange={(e) => setSodiumMg(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Option Favori */}
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={saveAsFav || isFavoriteFood(foodName || mealName)}
            onChange={(e) => setSaveAsFav(e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 bg-slate-950 border-slate-800 cursor-pointer"
          />
          <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
            <Star
              className={`w-3.5 h-3.5 ${
                isFavoriteFood(foodName || mealName) ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
              }`}
            />
            <span>
              {isFavoriteFood(foodName || mealName)
                ? 'Déjà dans vos favoris ⭐'
                : 'Enregistrer cet aliment dans mes favoris'}
            </span>
          </span>
        </label>

        {/* Boutons d'action */}
        <div className="pt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleOpenReview}
            className="py-3 px-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <span>Ajuster curseurs</span>
          </button>

          <button
            type="submit"
            className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Enregistrer direct</span>
          </button>
        </div>
      </form>
    </div>
  );
};
