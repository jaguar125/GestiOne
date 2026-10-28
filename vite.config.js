import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import safeArea from "./vite-safe-area.js";

export default defineConfig({
  // safeArea() : marge de sécurité automatique en bas de toutes les fenêtres
  // (voir vite-safe-area.js). Il doit rester AVANT react().
  plugins: [safeArea(), react()],
  build: {
    // Démarrage plus rapide : React et les graphiques dans des fichiers à part
    // (mis en cache séparément), les modules Hôtel / Cyber / Bar / Aluminium
    // ne sont chargés que pour ces types d'entreprise.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          charts: ["recharts"],
        },
      },
    },
  },
});
