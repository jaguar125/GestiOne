// src/appVersion.js
// Numéro de version de l'application, à augmenter à chaque nouvelle version
// publiée (web et APK). Le serveur connaît la version de chaque téléphone et
// peut demander une mise à jour (voir UpdateGate dans App.jsx et la table
// app_config côté Supabase : { min, latest, message, apk_url }).
export const APP_VERSION = 30;
