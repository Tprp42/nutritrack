import React, { useState } from 'react';
import { NutritionProvider, useNutrition } from './context/NutritionContext';
import { Header } from './components/layout/Header';
import { Navigation, ActiveTab } from './components/layout/Navigation';
import { WeeklyBudgetCard } from './components/dashboard/WeeklyBudgetCard';
import { WeekDaysStrip } from './components/dashboard/WeekDaysStrip';
import { MacroNutrientBreakdown } from './components/dashboard/MacroNutrientBreakdown';
import { MealList } from './components/dashboard/MealList';
import { MealInputModal } from './components/meal-entry/MealInputModal';
import { MealReviewModal } from './components/meal-entry/MealReviewModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { ProfileCalculatorModal } from './components/settings/ProfileCalculatorModal';
import { AnalyticsBoard } from './components/analytics/AnalyticsBoard';
import { GeminiNutritionResponse } from './services/gemini';
import { Meal, Ingredient } from './types/nutrition';

const AppContent: React.FC = () => {
  const { addMeal, updateMeal, setSelectedDate } = useNutrition();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // États des modales
  const [isMealInputOpen, setIsMealInputOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // État de l'écran d'ajustement/revue
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewData, setReviewData] = useState<GeminiNutritionResponse | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [reviewSource, setReviewSource] = useState<'photo' | 'text' | 'manual'>('text');

  // Déclencheur après analyse réussie (photo ou texte)
  const handleMealAnalyzed = (data: GeminiNutritionResponse, source: 'photo' | 'text' | 'manual') => {
    setIsMealInputOpen(false);
    setReviewData(data);
    setEditingMeal(null);
    setReviewSource(source);
    setIsReviewOpen(true);
  };

  // Édition d'un repas existant
  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setReviewData(null);
    setReviewSource(meal.source);
    setIsReviewOpen(true);
  };

  // Duplication d'un repas complet (0 appel API)
  const handleDuplicateMeal = (meal: Meal) => {
    setEditingMeal(null);
    setReviewData({
      repas_nom: meal.repas_nom,
      ingredients: meal.ingredients.map(ing => ({
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
    });
    setReviewSource('manual');
    setIsReviewOpen(true);
  };

  // Copie d'un aliment unique vers un nouveau repas (0 appel API)
  const handleCopyIngredient = (ingredient: Ingredient) => {
    setEditingMeal(null);
    setReviewData({
      repas_nom: ingredient.nom,
      ingredients: [
        {
          nom: ingredient.nom,
          poids_estime_g: ingredient.poids_estime_g,
          calories: ingredient.calories,
          proteines_g: ingredient.proteines_g,
          glucides_g: ingredient.glucides_g,
          lipides_g: ingredient.lipides_g,
          fibres_g: ingredient.fibres_g,
          sodium_mg: ingredient.sodium_mg
        }
      ],
      confiance: 'haute'
    });
    setReviewSource('manual');
    setIsReviewOpen(true);
  };

  // Sauvegarde finale après ajustements des curseurs/boutons
  const handleSaveMeal = (mealData: Omit<Meal, 'id' | 'timestamp'> & { id?: string }) => {
    if (editingMeal) {
      updateMeal({
        ...editingMeal,
        ...mealData,
        id: editingMeal.id,
        timestamp: editingMeal.timestamp
      });
    } else {
      addMeal(mealData);
    }
    setIsReviewOpen(false);
    setEditingMeal(null);
    setReviewData(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* En-tête Sticky avec Safe Area iOS */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Contenu Principal Mobile-First avec marge basse pour dégager la barre de navigation */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-fadeIn">
            {/* 1. Carte Budget Hebdomadaire & Moyenne journalière restante */}
            <WeeklyBudgetCard />

            {/* 2. Bandeau tactile des 7 jours de la semaine */}
            <WeekDaysStrip />

            {/* 3. Répartition des Macros du jour (avec dépliage Fibres/Sodium) */}
            <MacroNutrientBreakdown />

            {/* 4. Liste chronologique des repas du jour sélectionné */}
            <MealList
              onOpenNewMeal={() => setIsMealInputOpen(true)}
              onEditMeal={handleEditMeal}
              onDuplicateMeal={handleDuplicateMeal}
              onCopyIngredient={handleCopyIngredient}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsBoard
            onGoToWeek={(weekStartDate) => {
              setSelectedDate(weekStartDate);
              setActiveTab('dashboard');
            }}
          />
        )}


        {activeTab === 'profile' && (
          <div className="animate-fadeIn py-2">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 text-center">
              <h3 className="text-base font-extrabold text-white mb-1">
                Objectifs & Métabolisme
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Définissez votre profil et ajustez vos objectifs (Perte de poids vs Prise de masse).
              </p>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Ouvrir le calculateur personnalisé
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-fadeIn py-2">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 text-center">
              <h3 className="text-base font-extrabold text-white mb-1">
                Paramètres de l'Application
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Gérez votre clé API Gemini, vos sauvegardes locales JSON et le mode PWA.
              </p>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Accéder aux Réglages & Sauvegardes
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Barre de navigation inférieure fixe */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (tab === 'profile') setIsProfileOpen(true);
          else if (tab === 'settings') setIsSettingsOpen(true);
          else setActiveTab(tab);
        }}
        onOpenNewMeal={() => setIsMealInputOpen(true)}
      />

      {/* Modale de Saisie : Photo / Texte */}
      <MealInputModal
        isOpen={isMealInputOpen}
        onClose={() => setIsMealInputOpen(false)}
        onSuccess={handleMealAnalyzed}
        onOpenSettings={() => {
          setIsMealInputOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* Modale d'Ajustement & Validation Intuitif */}
      {isReviewOpen && (
        <MealReviewModal
          isOpen={isReviewOpen}
          initialData={reviewData}
          existingMeal={editingMeal}
          source={reviewSource}
          onClose={() => {
            setIsReviewOpen(false);
            setEditingMeal(null);
            setReviewData(null);
          }}
          onSave={handleSaveMeal}
        />
      )}

      {/* Modale des Réglages & Sécurité API */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Modale du Calculateur de Profil Métabolique */}
      <ProfileCalculatorModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <NutritionProvider>
      <AppContent />
    </NutritionProvider>
  );
};

export default App;
