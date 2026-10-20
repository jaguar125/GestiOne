import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import safeArea from "./vite-safe-area.js";

export default defineConfig({
  // safeArea() : marge de sécurité automatique en bas de toutes les fenêtres
  // (voir vite-safe-area.js). Il doit rester AVANT react().
  plugins: [safeArea(), react()],
});
