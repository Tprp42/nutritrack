# NutriTrack 🥗⚡

> Application de suivi nutritionnel et calorique, **vibe codée** pour un **usage personnel** avec l'assistance d'une IA (Google Antigravity).

📱 **Accéder à l'application :** [https://tprp42.github.io/nutritrack/](https://tprp42.github.io/nutritrack/)

---

## 🎯 Présentation

**NutriTrack** est une Progressive Web App (PWA) conçue pour suivre facilement ses repas, calories et macronutriments au quotidien, directement depuis son smartphone ou son navigateur.

Elle combine l'analyse par intelligence artificielle (photo ou description libre) avec une saisie manuelle rapide pour les encas du quotidien.

---

## ✨ Fonctionnalités

### 🍽️ 3 Modes de Saisie
- **Photo** : Prenez une photo de votre plat, l'IA estime automatiquement les ingrédients, grammages et nutriments.
- **Texte libre** : Décrivez votre repas en langage naturel (*ex: 150g de saumon, 200g de patates douces, 1 filet d'huile d'olive*).
- **Saisie Manuelle Rapide** : Pour ajouter directement un aliment sans passer par l'IA (*ex: 2 carrés de chocolat noir, une pomme, une poignée d'amandes*).

### ✏️ Édition Facile & Précise
- Ajustez les grammages avec des boutons rapides ou un slider interactif.
- Modifiez librement les macronutriments (**Glucides**, **Protéines**, **Lipides**) et micronutriments (**Fibres**, **Sodium**).
- Ajoutez ou retirez des aliments au sein d'un repas.

### ⭐ Favoris & Autocomplétion
- Enregistrez vos aliments ou repas types en favoris en 1 tap (ex: petit-déjeuner habituel, yaourt nature...).
- Suggestions discrètes au clavier pour remplir automatiquement vos aliments fréquents.

### 📊 Budget Calorique Hebdomadaire
- Définissez un budget calorique à la semaine (ex: 17 500 kcal/semaine).
- **Rééquilibrage dynamique** : la cible quotidienne s'ajuste automatiquement selon ce qui a été consommé les jours précédents, sans culpabiliser après un repas plus copieux.

### 🧬 Calculateur selon Profil & Objectifs
- Calcul des besoins (BMR & TDEE) selon votre profil.
- Cibles adaptées selon votre objectif : **Perte de poids / Sèche**, **Maintien** ou **Prise de masse / Muscle**.

### 💾 Données Locales
- Vos repas et réglages sont stockés directement dans votre navigateur (`localStorage`).
- Export et import de vos données en un clic (fichier `.json`).

---

## 📲 Installer sur iPhone (Mode Plein Écran)

Pour l'utiliser comme une vraie application sur votre iPhone :

1. Ouvrez [https://tprp42.github.io/nutritrack/](https://tprp42.github.io/nutritrack/) dans **Safari**.
2. Appuyez sur le bouton **Partager** (le carré avec la flèche vers le haut).
3. Choisissez **« Sur l'écran d'accueil »** puis touchez **Ajouter**.

L'application s'ouvrira ensuite en plein écran, comme une application native.

---

## 💻 Développement

```bash
# Installation
npm install

# Lancer en local
npm run dev

# Build
npm run build
```

---

## 📄 Notes

Projet personnel vibe-codé pour expérimentation et usage quotidien.
