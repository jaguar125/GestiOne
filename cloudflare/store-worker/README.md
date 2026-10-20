# GestiOne : serveur de synchronisation Cloudflare

Ce serveur reçoit tous les appels de synchronisation des téléphones à la place de la fonction Supabase « store ». Il ajoute aussi la **synchronisation en direct** : un téléphone qui enregistre quelque chose prévient aussitôt les autres.

- **La base de données ne bouge pas.** Elle reste chez Supabase, avec les mêmes tables et les mêmes données.
- **Si Cloudflare ne répond pas**, l'application repasse automatiquement par Supabase pendant 1 minute.
- **Si le direct ne fonctionne pas**, l'application revient à la synchronisation toutes les 25 secondes.

## Ce qu'il faut

- Un compte Cloudflare (gratuit) : https://dash.cloudflare.com/sign-up
- Un ordinateur avec Node.js 18 ou plus récent.
- La clé secrète Supabase. Elle se trouve dans Supabase → Project Settings → API Keys → **service_role** (ou « secret »). Elle ne doit **jamais** être mise dans l'application.

## Installation (une seule fois, environ 10 minutes)

Toutes les commandes se lancent dans ce dossier (`cloudflare/store-worker`).

```bash
npx wrangler login
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler deploy
```

1. `npx wrangler login` ouvre le navigateur. Connectez-vous à Cloudflare et cliquez sur « Allow ».
2. `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` demande la clé : collez la clé service_role, puis appuyez sur Entrée.
3. `npx wrangler deploy` affiche à la fin l'adresse du serveur, par exemple :
   `https://gestione.VOTRE-COMPTE.workers.dev`

## Vérifier

Ouvrez `https://gestione.VOTRE-COMPTE.workers.dev/health` dans le navigateur. La page doit afficher :

```json
{"ok":true,"service":"gestione-store","live":true}
```

## Brancher l'application

Choisissez **une** des deux façons :

- dans `src/serverConfig.js`, mettez l'adresse entre les guillemets :
  `const WORKER_URL_HERE = "https://gestione.VOTRE-COMPTE.workers.dev";`
- ou dans Vercel → Settings → Environment Variables, ajoutez
  `VITE_GESTIONE_WORKER_URL` = l'adresse.

Ensuite, reconstruisez et redéployez l'application (web et APK), puis mettez à jour **tous les téléphones**.

## Suivre la consommation

Allez dans Cloudflare → Workers & Pages → gestione → Metrics, ou lancez `npx wrangler tail` pour voir les appels en temps réel.

- **Offre gratuite :** 100 000 appels par jour. Chaque appel est limité à 10 ms de calcul ; une très grosse entreprise peut dépasser cette limite, et l'appel repasse alors automatiquement par Supabase.
- **Offre Workers Paid (5 $ par mois) :** 10 millions d'appels par mois, puis 0,30 $ par million, et pas de limite gênante de calcul. C'est l'offre à prendre dès que l'application est en production avec plusieurs entreprises.

## Mettre à jour le serveur plus tard

```bash
npx wrangler deploy
```
