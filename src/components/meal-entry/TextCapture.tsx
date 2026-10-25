import React, { useState, useMemo } from 'react';
import { Sparkles, Loader2, AlertCircle, Star, Utensils, Apple, History, Zap } from 'lucide-react';
import { analyzeMealText, GeminiNutritionResponse } from '../../services/gemini';
import { useNutrition } from '../../context/NutritionContext';
import { AutocompleteSuggestions } from './AutocompleteSuggestions';
import { extractRecentFoods, extractRecentMeals, tryMatchTextWithKnownFoods } from '../../utils/recentFoods';

interface TextCaptureProps {
  onSuccess: (data: GeminiNutritionResponse, source: 'text' | 'manual') => void;
  onOpenSettings: () => void;
}

export const TextCapture: React.FC<TextCaptureProps> = ({ onSuccess, onOpenSettings }) => {
  const { settings, favorites, meals } = useNutrition();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recentFoods = useMemo(() => extractRecentFoods(meals, 25), [meals]);
  const recentMeals = useMemo(() => extractRecentMeals(meals, 6), [meals]);

  // Combine favoris + récents pour matching local instantané
  const allKnownFoods = useMemo(() => {
    const list: Array<any> = [...(favorites.foods || [])];
    const seen = new Set(list.map(f => f.nom.toLowerCase()));
    for (const r of recentFoods) {
      if (!seen.has(r.nom.toLowerCase())) {
        list.push(r);
        seen.add(r.nom.toLowerCase());
      }
    }
    return list;
  }, [favorites.foods, recentFoods]);

  // Tentative de correspondance locale en temps réel
  const localMatch = useMemo(() => {
    if (!text.trim() || text.trim().length < 3) return null;
    return tryMatchTextWithKnownFoods(text, allKnownFoods);
  }, [text, allKnownFoods]);

  const suggestions = [
    "1 steak haché 15% 125g, 200g de riz blanc cuit, 1 filet d'huile d'olive",
    "200g de filet de saumon, 150g de patates douces rôties, brocolis vapeur",
    "3 oeufs brouillés, 2 tranches de pain complet, 1/2 avocat",
    "1 bowl de fromage blanc 0% 250g, 30g de flocons d'avoine, 1 banane, 15g d'amandes"
  ];

  const handleUseLocalMatch = () => {
    if (!localMatch || localMatch.length === 0) return;
    const response: GeminiNutritionResponse = {
      repas_nom: text.length <= 40 ? text : 'Repas (Aliments connus)',
      ingredients: localMatch.map(ing => ({
        nom: ing.nom,
        poids_estime_g: ing.poids_estime_g,
        calories: ing.calories,
        proteines_g: ing.proteines_g,
        glucides_g: ing.glucides_g,
        lipides_g: ing.lipides_g,
        fibres_g: ing.fibres_g,
        sodium_mg: ing.sodium_mg
      })),
      confiance: 'haute'
    };
    onSuccess(response, 'manual');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    // Si on a un match local parfait ou suffisant et que l'utilisateur n'a pas de clé API,
    // on utilise immédiatement le local match !
    if (localMatch && localMatch.length > 0 && (!settings.geminiApiKey || settings.geminiApiKey.trim() === '')) {
      handleUseLocalMatch();
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (!settings.geminiApiKey || settings.geminiApiKey.trim() === '') {
        setErrorMsg("Veuillez renseigner votre clé d'API Gemini gratuite dans les Réglages pour analyser votre texte avec l'IA.");
        setIsLoading(false);
        return;
      }

      const response = await analyzeMealText(text, settings.geminiApiKey, settings.geminiModel);
      setIsLoading(false);
      onSuccess(response, 'text');
    } catch (err: any) {
      console.error("Erreur d'analyse texte:", err);
      // Fallback gracieux si l'API échoue mais qu'on a un match local :
      if (localMatch && localMatch.length > 0) {
        setIsLoading(false);
        handleUseLocalMatch();
        return;
      }
      setErrorMsg(err.message || "Erreur lors de l'analyse du texte. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  const handleSelectFavMeal = (meal: any) => {
    if (meal.ingredients && meal.ingredients.length > 0) {
      const description = meal.ingredients
        .map((ing: any) => `${ing.poids_estime_g}g de ${ing.nom}`)
        .join(', ');
      setText(description);
    } else {
      setText(meal.nom);
    }
  };

  const handleSelectFavFood = (food: any) => {
    const weight = food.poids_g || food.poids_estime_g || 100;
    const itemDesc = `${weight}g de ${food.nom}`;
    setText((prev) => (prev.trim() ? `${prev.trim()}, ${itemDesc}` : itemDesc));
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">{errorMsg}</p>
            {!settings.geminiApiKey && (
              <button
                onClick={onOpenSettings}
                className="mt-2 px-3 py-1 bg-rose-500 text-white rounded-lg font-bold hover:bg-rose-600 transition-colors inline-block"
              >
                Ouvrir les Réglages
              </button>
            )}
          </div>
        </div>
      )}

      {/* Raccourcis Favoris de l'utilisateur */}
      {(favorites.meals.length > 0 || favorites.foods.length > 0 || recentFoods.length > 0) && (
        <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 space-y-2">
          {/* Favoris */}
          {(favorites.meals.length > 0 || favorites.foods.length > 0) && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>Favoris en 1 clic :</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 overscroll-contain">
                {favorites.meals.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectFavMeal(m)}
                    className="text-[11px] py-1 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:text-amber-100 transition-all active:scale-95 font-semibold flex items-center gap-1"
                  >
                    <Utensils className="w-3 h-3 text-amber-400" />
                    <span>{m.nom}</span>
                  </button>
                ))}
                {favorites.foods.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectFavFood(f)}
                    className="text-[11px] py-1 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all active:scale-95 font-semibold flex items-center gap-1"
                  >
                    <Apple className="w-3 h-3 text-emerald-400" />
                    <span>{f.nom}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Récents */}
          {(recentFoods.length > 0 || recentMeals.length > 0) && (
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800/60">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400">
                <History className="w-3 h-3 text-sky-400" />
                <span>Repas & aliments récents (0 appel API) :</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 overscroll-contain">
                {recentMeals.map((rm) => (
                  <button
                    key={rm.id}
                    type="button"
                    onClick={() => handleSelectFavMeal(rm)}
                    className="text-[11px] py-1 px-2.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/50 text-sky-200 hover:text-white transition-all active:scale-95 font-semibold flex items-center gap-1"
                  >
                    <Utensils className="w-2.5 h-2.5 text-sky-400" />
                    <span>{rm.nom}</span>
                    <span className="text-[10px] text-sky-300/70 font-normal">({rm.totalCalories} kcal)</span>
                  </button>
                ))}
                {recentFoods.slice(0, 8).map((rf) => (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => handleSelectFavFood(rf)}
                    className="text-[11px] py-1 px-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/40 text-sky-200 hover:text-white transition-all active:scale-95 font-semibold flex items-center gap-1"
                  >
                    <History className="w-2.5 h-2.5 text-sky-400" />
                    <span>{rf.nom}</span>
                    <span className="text-[10px] text-sky-300/70 font-normal">({rf.poids_g}g)</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Décrivez votre repas en langage naturel :
          </label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: 1 steak haché 15% 125g, 200g de riz cuit, 1 filet d'huile d'olive..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none leading-relaxed"
          />

          <AutocompleteSuggestions
            query={text}
            className="mt-2"
            onSelectMeal={handleSelectFavMeal}
            onSelectFood={handleSelectFavFood}
          />
        </div>

        {/* Détection locale instantanée sans appel API */}
        {localMatch && localMatch.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-emerald-950/70 to-teal-950/70 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Aliments connus détectés !</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">0 appel API</span>
                </div>
                <div className="text-[11px] text-emerald-300/80 truncate">
                  {localMatch.map(m => `${m.nom} (${m.poids_estime_g}g)`).join(', ')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseLocalMatch}
              className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex-shrink-0 shadow-sm active:scale-95 transition-all"
            >
              Valider direct
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calcul des nutriments par l'IA...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Estimer les calories & nutriments</span>
            </>
          )}
        </button>
      </form>

      {/* Suggestions rapides */}
      <div className="pt-2">
        <span className="text-[11px] font-semibold text-slate-400 block mb-2">
          Exemples rapides (cliquez pour tester) :
        </span>
        <div className="space-y-1.5">
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setText(sug)}
              className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 hover:text-white transition-colors line-clamp-1"
            >
              👉 {sug}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
