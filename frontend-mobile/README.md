# Application mobile – Surveillance Santé (React Native / Expo)

## Prérequis

- Node.js 18+
- Expo CLI : `npm install -g expo-cli` (ou utiliser `npx expo`)

## Démarrage

```bash
npm install
npx expo start
```

Puis scanner le QR code avec l'app **Expo Go** sur votre téléphone, ou lancer un émulateur (Android/iOS).

## Configuration API

Modifier `API_BASE` dans `App.js` pour pointer vers l'API Gateway (ex. `http://VOTRE_IP:8080` pour un appareil physique sur le même réseau).

## Assets Expo

Si Expo signale des fichiers manquants (`assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png`), ajouter des images de remplacement dans le dossier `assets/` ou générer un projet Expo vierge puis copier les assets :

```bash
npx create-expo-app@latest temp-app --template blank
cp temp-app/assets/* assets/  # si dossier assets présent
```

Ensuite supprimer `temp-app` si besoin.
