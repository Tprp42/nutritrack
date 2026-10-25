import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, AlertCircle, X, Plus } from 'lucide-react';
import { compressImageFile } from '../../services/imageCompressor';
import { analyzeMealPhoto, GeminiNutritionResponse } from '../../services/gemini';
import { useNutrition } from '../../context/NutritionContext';

interface PhotoCaptureProps {
  onSuccess: (data: GeminiNutritionResponse, source: 'photo') => void;
  onOpenSettings: () => void;
}

interface ImageItem {
  id: string;
  dataUrl: string;
  base64Data: string;
  mimeType: string;
  sizeKb: number;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onSuccess, onOpenSettings }) => {
  const { settings } = useNutrition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const fileArray = Array.from(files);
    const newItems: ImageItem[] = [];

    for (const file of fileArray) {
      try {
        const result = await compressImageFile(file, 1024, 0.75);
        newItems.push({
          id: 'img_' + Math.random().toString(36).substring(2, 9),
          dataUrl: result.dataUrl,
          base64Data: result.base64Data,
          mimeType: result.mimeType,
          sizeKb: Math.round(result.compressedSizeBytes / 1024)
        });
      } catch (err: any) {
        console.error("Erreur de compression d'image:", err);
      }
    }

    if (newItems.length > 0) {
      setSelectedImages((prev) => [...prev, ...newItems].slice(0, 6)); // Jusqu'à 6 photos max
    }
  };

  const handleRemoveImage = (id: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleAnalyze = async () => {
    if (selectedImages.length === 0) return;

    if (!settings.geminiApiKey || settings.geminiApiKey.trim() === '') {
      setErrorMsg("Veuillez renseigner votre clé d'API Gemini gratuite dans les Réglages pour analyser vos photos.");
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const response = await analyzeMealPhoto(
        selectedImages.map((img) => ({
          base64Data: img.base64Data,
          mimeType: img.mimeType
        })),
        'image/jpeg',
        settings.geminiApiKey,
        settings.geminiModel,
        notes
      );

      // Purgation des données en mémoire
      setSelectedImages([]);
      setIsProcessing(false);
      onSuccess(response, 'photo');
    } catch (err: any) {
      console.error("Erreur d'analyse photo:", err);
      setErrorMsg(err.message || "Impossible d'analyser les photos. Veuillez réessayer.");
      setIsProcessing(false);
    }
  };

  const totalSizeKb = selectedImages.reduce((sum, img) => sum + img.sizeKb, 0);

  return (
    <div className="space-y-4">
      {/* Inputs masqués */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Message d'erreur si présent */}
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

      {/* État de chargement pendant l'analyse Gemini */}
      {isProcessing ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            {selectedImages[0] ? (
              <img
                src={selectedImages[0].dataUrl}
                alt="Aperçu repas"
                className="w-full h-full object-cover rounded-2xl opacity-40 blur-xs"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Camera className="w-8 h-8 text-emerald-400" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Analyse Gemini en cours ({selectedImages.length} photo{selectedImages.length > 1 ? 's' : ''})...
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Combinaison des photos, détection des aliments et calcul des calories en direct.
            </p>
            <span className="inline-block mt-2 text-[10px] text-slate-500 font-medium">
              Photos compressées : {totalSizeKb} Ko au total (0 persistance)
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Prévisualisation des images sélectionnées */}
          {selectedImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Photos sélectionnées ({selectedImages.length}) :</span>
                <span className="text-[10px] text-slate-500">{totalSizeKb} Ko</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {selectedImages.map((img, idx) => (
                  <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group">
                    <img src={img.dataUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute top-1 right-1 p-1 bg-slate-950/80 hover:bg-rose-500 text-white rounded-lg transition-colors"
                      title="Retirer cette photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[9px] font-bold bg-slate-950/70 text-slate-300 rounded">
                      #{idx + 1}
                    </span>
                  </div>
                ))}

                {/* Bouton d'ajout d'une photo supplémentaire si < 6 */}
                {selectedImages.length < 6 && (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="aspect-square rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/40 hover:bg-slate-900 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-400 transition-all text-[11px]"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Ajouter</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Précisions facultatives */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Précisions facultatives (facilite la détection de l'IA)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: plat + dessert, sans sauce, 1 pain complet..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Boutons d'action Photo / Galerie */}
          {selectedImages.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Déclencheur Caméra native */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-slate-950/20 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-slate-950" />
                </div>
                <span className="text-xs">Prendre une photo</span>
              </button>

              {/* Choisir dans la Galerie (sélection multiple supportée) */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-xs">Depuis la galerie</span>
                <span className="text-[10px] text-slate-400 font-normal">(1 ou plusieurs)</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleAnalyze}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyser {selectedImages.length > 1 ? `les ${selectedImages.length} photos` : 'la photo'} avec Gemini</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Prendre photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Ajouter galerie</span>
                </button>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">💡 Astuces multi-photos :</p>
            <p>• Vous pouvez sélectionner plusieurs photos à la fois dans votre galerie (ex: plat + entrée ou dessert).</p>
            <p>• Les photos sont compressées en mémoire vive et détruites sitôt l'analyse terminée.</p>
          </div>
        </>
      )}
    </div>
  );
};
