import React, { useState, useRef } from 'react';
import { 
  X, 
  Key, 
  ShieldCheck, 
  ExternalLink, 
  Download, 
  Upload, 
  Trash2, 
  Check, 
  Smartphone, 
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { settings, updateSettings, exportData, importData, resetData } = useNutrition();

  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [model, setModel] = useState(
    settings.geminiModel === 'gemini-2.5-flash' || !settings.geminiModel 
      ? 'gemini-3.6-flash' 
      : settings.geminiModel
  );
  const [weeklyBudget, setWeeklyBudget] = useState(settings.weeklyCalorieBudget || 17500);
  const [showKeySecurityGuide, setShowKeySecurityGuide] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings({
      geminiApiKey: apiKey.trim(),
      geminiModel: model,
      weeklyCalorieBudget: Number(weeklyBudget) || 17500
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus("Importation et vérification des données...");
      const result = await importData(file);
      setImportStatus(`Succès : ${result.count} repas importés avec succès !`);
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'importation");
      setImportStatus(null);
    }
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
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Paramètres & Sécurité
              </h3>
              <p className="text-[10px] text-slate-400">
                Clé API personnelle, sauvegarde JSON et guide PWA
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
          {/* Section 1 : Clé API Google Gemini */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                Clé d'API Google Gemini
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2"
              >
                Obtenir ma clé gratuite <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Collez votre clé API Gemini (AIza...)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Stockée exclusivement dans le navigateur de votre appareil. Zéro transmission à un serveur tiers.
              </span>
            </div>

            {/* Modèle Gemini */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-emerald-400" /> Modèle d'IA utilisé
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="gemini-3.6-flash">Gemini 3.6 Flash (Recommandé, multimodal ultra-rapide)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </select>
            </div>

            {/* Guide déroulant : Comment ne pas laisser ma clé publique */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowKeySecurityGuide(!showKeySecurityGuide)}
                className="w-full text-left flex items-center justify-between text-[11px] font-bold text-slate-300 hover:text-white"
              >
                <span className="flex items-center gap-1.5 text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Comment garantir que ma clé reste 100% privée ?
                </span>
                {showKeySecurityGuide ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showKeySecurityGuide && (
                <div className="mt-2.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 space-y-2 leading-relaxed animate-fadeIn">
                  <p>
                    <strong>1. Jamais dans le code source :</strong> Cette application est hébergée sans aucune clé intégrée dans ses fichiers Git. Votre clé n'apparaît nulle part sur GitHub.
                  </p>
                  <p>
                    <strong>2. Stockage local exclusif :</strong> La clé saisie ci-dessus est enregistrée dans le <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">localStorage</code> privé de votre navigateur sur ce smartphone.
                  </p>
                  <p>
                    <strong>3. Recommandation Google AI Studio :</strong> Dans la console Google Cloud de votre clé, vous pouvez restreindre son usage uniquement à l'API <em>« Generative Language API »</em> et laisser la facturation désactivée pour plafonner au quota gratuit sans surprise.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2 : Budget Hebdomadaire Manuel */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-white block">
              Budget Hebdomadaire Cible
            </span>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  step={100}
                  value={weeklyBudget}
                  onChange={(e) => setWeeklyBudget(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                kcal / semaine (~{Math.round(weeklyBudget / 7)} kcal/j)
              </span>
            </div>
          </div>

          {/* Section 3 : Sauvegarde & Restauration (Export / Import JSON) */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div>
              <span className="text-xs font-bold text-white block">
                Sauvegarde Locale des Données (Export / Import)
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Conservez vos données sur votre appareil ou transférez-les vers un autre téléphone sans aucun compte en ligne.
              </p>
            </div>

            {importStatus && (
              <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 font-semibold">
                {importStatus}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={exportData}
                className="py-2 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exporter (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Importer (JSON)</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>

          {/* Section 4 : Guide Installation Safari iOS */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setShowIosGuide(!showIosGuide)}
              className="w-full text-left flex items-center justify-between text-xs font-bold text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Installation sur iPhone (Safari Plein Écran)
              </span>
              {showIosGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showIosGuide && (
              <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-2 leading-relaxed animate-fadeIn">
                <p>Pour profiter de NutriTrack comme une véritable application native :</p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-300">
                  <li>Ouvrez cette page dans <strong>Safari</strong> sur votre iPhone.</li>
                  <li>Touchez l'icône <strong>Partager</strong> (le carré avec une flèche vers le haut au bas de l'écran).</li>
                  <li>Faites défiler et touchez <strong>« Sur l'écran d'accueil »</strong>.</li>
                  <li>Touchez <strong>Ajouter</strong> en haut à droite.</li>
                </ol>
                <p className="text-[10px] text-emerald-400 font-semibold pt-1">
                  ✓ L'application fonctionnera en plein écran, sans la barre d'adresse de Safari, avec gestion automatique de l'encoche et de la Dynamic Island.
                </p>
              </div>
            )}
          </div>

          {/* Zone de Danger : Réinitialisation */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (confirm("Êtes-vous sûr de vouloir supprimer tous les repas enregistrés ?")) {
                  resetData();
                  alert("Toutes les données ont été réinitialisées.");
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 py-1 px-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Réinitialiser l'historique des repas
            </button>
          </div>
        </div>

        {/* Pied Fixe : Sauvegarder les paramètres */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between gap-3">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Enregistré !
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all text-xs ml-auto"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Sauvegarder les réglages</span>
          </button>
        </div>
      </div>
    </div>
  );
};
