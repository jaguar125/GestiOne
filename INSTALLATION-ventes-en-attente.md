# GestiOne — Ventes en attente + catégories sur une ligne + marge de sécurité

Fichiers à copier dans `C:\Users\ayeko\GestiOne\` (en remplaçant ceux qui existent) :

| Fichier | |
|---|---|
| `src/App.jsx` | Ventes en attente, catégories sur une ligne |
| `src/HeldSales.jsx` | **Nouveau** : fenêtre, bandeau, onglet, liste des ventes en attente |
| `src/api.js` | Synchronisation de la nouvelle donnée « heldSales » |
| `vite.config.js` | Active la marge de sécurité automatique |
| `vite-safe-area.js` | **Nouveau** (à la racine, à côté de vite.config.js) |
| `supabase/functions/store/index.ts` | Copie de la version déjà en ligne (rien à déployer) |

Puis :

    npm run build
    npx cap sync android

et générer l'APK / AAB dans Android Studio.

## Ce qui change
- Panier : bouton « Mettre en attente » à gauche de « Encaisser ».
- Fenêtre : nom rapide (Table 1–4, Comptoir, À emporter, Terrasse) ou libre, client optionnel.
- Vendre : bandeau « N ventes en attente », panier libéré pour une nouvelle vente.
- Historique : onglets « Ventes | En attente », avec Reprendre / Encaisser / Supprimer.
- Une vente en attente ne compte ni dans les ventes du jour, ni dans la caisse ; le stock
  n'est déduit qu'à l'encaissement (contrôle du stock au moment d'encaisser).
- Reprendre alors qu'un panier est en cours : le panier en cours est mis en attente
  automatiquement.
- Ventes en attente synchronisées entre les téléphones de l'entreprise.
