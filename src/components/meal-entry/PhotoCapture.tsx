import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { compressImageFile } from '../../services/imageCompressor';
import { analyzeMealPhoto, GeminiNutritionResponse } from '../../services/gemini';
import { useNutrition } from '../../context/NutritionContext';

interface PhotoCaptureProps {
  onSuccess: (data: GeminiNutritionResponse, source: 'photo') => void;
  onOpenSettings: () => void;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onSuccess, onOpenSettings }) => {
  const { settings } = useNutrition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [compressedInfo, setCompressedInfo] = useState<{ orig: number; comp: number } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      // 1. Compression Canvas HTML5 côté client
      const result = await compressImageFile(file, 1024, 0.75);
      setPreviewUrl(result.dataUrl);
      setCompressedInfo({
        orig: Math.round(result.originalSizeBytes / 1024),
        comp: Math.round(result.compressedSizeBytes / 1024)
      });

      // 2. Vérification de la présence de la clé API
      if (!settings.geminiApiKey || settings.geminiApiKey.trim() === '') {
        setErrorMsg("Veuillez renseigner votre clé d'API Gemini gratuite dans les Réglages pour analyser la photo.");
        setIsProcessing(false);
        return;
      }

      // 3. Appel de l'API Gemini Multimodal
      const response = await analyzeMealPhoto(
        result.base64Data,
        result.mimeType,
        settings.geminiApiKey,
        settings.geminiModel,
        notes
      );

      // Purgation de l'image de la mémoire pour économiser le stockage
      setPreviewUrl(null);
      setIsProcessing(false);
      onSuccess(response, 'photo');
    } catch (err: any) {
      console.error("Erreur d'analyse photo:", err);
      setErrorMsg(err.message || "Impossible d'analyser cette photo. Veuillez réessayer.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Inputs masqués */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
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
          <div className="relative w-20 h-20 mx-auto">
            {previewUrl ? (
              <img
                src={previewUrl}
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
              Analyse Gemini en cours...
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Détection des aliments, estimation des portions et calcul des calories en direct.
            </p>
            {compressedInfo && (
              <span className="inline-block mt-2 text-[10px] text-slate-500 font-medium">
                Photo compressée : {compressedInfo.orig} Ko → {compressedInfo.comp} Ko (0 persistance)
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Précisions facultatives */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Précisions facultatives (facilite la détection de l'IA)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sans sauce, 1 pain complet, fromage de chèvre..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Boutons d'action Photo */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Déclencheur Caméra iPhone native */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-slate-950/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-slate-950" />
              </div>
              <span className="text-xs">Prendre une photo</span>
            </button>

            {/* Choisir dans la Galerie */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-xs">Depuis la galerie</span>
            </button>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">💡 Astuces photo :</p>
            <p>• Prenez le plat de dessus bien éclairé pour une estimation optimale des volumes.</p>
            <p>• Les photos sont compressées en mémoire vive et détruites sitôt l'analyse terminée.</p>
          </div>
        </>
      )}
    </div>
  );
};
