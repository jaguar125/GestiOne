// src/serverConfig.js
//
// Adresse du serveur de synchronisation Cloudflare (Worker « gestione-store »).
// Vide = l'application continue d'utiliser uniquement Supabase, comme avant.
//
// Deux façons de la renseigner (une seule suffit) :
//   1. ici, entre les guillemets, puis reconstruire l'application ;
//   2. ou variable d'environnement VITE_GESTIONE_WORKER_URL (Vercel / .env).
//
// Exemple : "https://gestione-store.mon-compte.workers.dev"
const WORKER_URL_HERE = "https://gestione.ayekoe83.workers.dev";

export const WORKER_URL = String(
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GESTIONE_WORKER_URL) || WORKER_URL_HERE || ""
).replace(/\/+$/, "");
