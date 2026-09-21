import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Enregistrement automatique du Service Worker PWA
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log("Nouvelle version disponible pour NutriTrack PWA.");
      },
      onOfflineReady() {
        console.log("NutriTrack est prêt pour un fonctionnement 100% hors ligne.");
      },
    });
  }).catch((err) => {
    console.warn("Échec de l'enregistrement du Service Worker PWA:", err);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
