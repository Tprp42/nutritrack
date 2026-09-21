/**
 * Service de compression d'images côté client via HTML5 Canvas.
 * Réduit drastiquement le poids de la photo prise sur iPhone (ex: de 5-10 Mo à ~150-250 Ko)
 * avant l'envoi à l'API Gemini, garantissant vitesse d'analyse et économie de bande passante.
 * La photo n'est JAMAIS écrite sur le disque ni persistée.
 */

export interface CompressionResult {
  base64Data: string; // Base64 brut sans le préfixe data:image/jpeg;base64,
  mimeType: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  dataUrl: string; // URL temporaire pour la prévisualisation immédiate en RAM
}

export async function compressImageFile(
  file: File,
  maxDimension: number = 1024,
  quality: number = 0.75
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const originalSizeBytes = file.size;
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Calcul des proportions pour ne pas dépasser maxDimension
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Impossible d'initialiser le contexte Canvas 2D"));
            return;
          }

          // Rendu de l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height);

          // Export en JPEG compressé
          const mimeType = 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          const base64Data = dataUrl.split(',')[1];
          const compressedSizeBytes = Math.round((base64Data.length * 3) / 4);

          // Libération de la mémoire canvas
          canvas.width = 0;
          canvas.height = 0;

          resolve({
            base64Data,
            mimeType,
            originalSizeBytes,
            compressedSizeBytes,
            dataUrl
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error("Échec du chargement de l'image sélectionnée"));
      };

      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      } else {
        reject(new Error("Format de fichier non lisible"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Erreur de lecture du fichier"));
    };

    reader.readAsDataURL(file);
  });
}
