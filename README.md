# Boutique Templates

Galerie de templates web façon Dribbble, **sans compte** pour les visiteurs : recherche, catégories, aperçu en direct (ordinateur / tablette / mobile), code coloré, copie du code et téléchargement du projet complet en ZIP. Espace `/admin` pour ajouter des templates et poser ta signature.

JavaScript natif partout (aucun framework, ZIP lu/créé sans bibliothèque). Seule dépendance : Prisma (Postgres).

## Démarrer

1. Crée une base Postgres (Neon, Supabase, Vercel Postgres…).
2. Copie `.env.example` en `.env` et remplis `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
3. `npm install` puis `npm run db:push` (crée les tables) et `npm run db:seed` (catégories de départ).
4. `npm run dev` (nécessite la CLI Vercel : `npm i -g vercel`).

## Déployer sur Vercel

Importe le dépôt, ajoute les 3 variables d'environnement, déploie. Aucun build n'est nécessaire : `public/` est servi tel quel, `api/` devient 3 fonctions (le plan gratuit en autorise 12). Utilise l'URL **pooled** de ta base.

## Espace admin (`/admin`)

- **Ajouter** : archive ZIP, dossier, fichiers ou code collé (HTML / CSS / JS). Le ZIP est lu dans ton navigateur, puis envoyé par lots.
- **Signature** : tes initiales, un nom affiché, un badge (position, couleurs) et un commentaire `© initiales` en tête des fichiers. Elle est ajoutée **à la lecture** : la changer met à jour tous les templates immédiatement (aperçu, code copié, ZIP).
- **Mentions à retirer** : à l'import, les commentaires, liens `t.me/…` et crédits contenant ces termes sont supprimés ; le nom cité dans un texte (« créé par Coding Team ») est remplacé par ton nom. Le bouton « Appliquer… » re-nettoie les templates déjà importés.
- Les **licences open source** (Bootstrap, jQuery, Font Awesome…) sont conservées : elles sont obligatoires. Elles ne sont retirées que si tu ajoutes leur nom dans la liste.

## Limites à connaître

- Vercel limite une requête à 4,5 Mo : les fichiers de plus de **2,5 Mo** sont ignorés à l'import (signalés dans le journal). Les gros frameworks (gentelella, argon…) et les médias lourds ne passeront pas tels quels.
- Les fichiers sont stockés dans Postgres : surveille le quota de ta base.
- Les liens en chemin absolu (`/images/x.png`) dans un template ne sont pas réécrits : préfère des chemins relatifs.

## Sécurité

Le code des templates s'exécute dans une iframe **sandbox** (et la réponse porte un `Content-Security-Policy: sandbox`), donc il n'a pas accès au site ni à la session admin. Le cookie admin est `HttpOnly` + `SameSite=Strict`, et toute écriture exige un en-tête personnalisé (anti-CSRF).

## Tests

`npm test` : ZIP (lecture/écriture), nettoyage, signature, coloration, authentification.
