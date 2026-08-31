import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// --- Adaptateur de stockage --------------------------------------------
// Le composant App a été conçu pour l'environnement des artefacts Claude,
// qui fournit `window.storage` (clé/valeur, asynchrone) automatiquement.
// Ce petit adaptateur reproduit exactement la même interface en s'appuyant
// sur localStorage, afin que TOUT le code existant fonctionne sans aucune
// modification une fois déployé comme site web autonome.
//
// Limite à connaître : localStorage reste propre à cet appareil/navigateur
// (comme le stockage local du prototype). Pour une vraie synchronisation
// multi-appareils, brancher plutôt sur le backend Supabase préparé dans
// shop-backend/ + client-integration/api-client.js.
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      if (value === null) throw new Error(`Clé introuvable : ${key}`);
      return { key, value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
    async list(prefix) {
      const keys = Object.keys(localStorage).filter((k) => !prefix || k.startsWith(prefix));
      return { keys };
    },
  };
}
// -------------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
