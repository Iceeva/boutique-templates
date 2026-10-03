# Boutique Templates

Galerie de templates web façon Dribbble, **sans compte** pour les visiteurs : recherche, catégories, aperçu en direct (ordinateur / tablette / mobile), code coloré, copie du code et téléchargement du projet complet en ZIP. Espace `/admin` pour ajouter des templates et poser ta signature.

JavaScript natif partout (aucun framework, ZIP lu/créé sans bibliothèque). Seule dépendance : Prisma (Postgres).

## Essayer tout de suite (sans base de données)

```bash
npm run demo        # http://localhost:3000 — admin : mot de passe « demo »
```

Le mode démo exécute les vraies fonctions de `api/` avec les templates du seed chargés en mémoire. Rien n'est conservé à l'arrêt.

## Mettre en ligne

1. Crée une base Postgres (Neon, Supabase, Vercel Postgres…).
2. Copie `.env.example` en `.env` : `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
3. `npm install`, puis `npm run db:push` (tables) et `npm run db:seed` (catégories + templates).
4. Déploie sur Vercel avec les 3 mêmes variables (URL **pooled** pour la base). Aucun build : `public/` est servi tel quel, `api/` = 3 fonctions (le plan gratuit en autorise 12).

## Le seed (`seed/`)

`seed/manifest.js` décrit chaque template (titre, catégorie, mots-clés, description) et `seed/templates/` contient les archives. `npm run db:seed` :

- ajoute ce qui manque et **ne touche pas** aux templates déjà présents (`npm run db:seed -- --force` pour tout réimporter) ;
- retire les mentions d'auteur, comme à l'import par l'admin (en plus, les fichiers `.txt` de promotion — `auteur.txt`, `lis moi.txt`… — sont écartés) ;
- aplatit les dossiers englobants, ignore `__MACOSX`, `node_modules`, `.git`.

`npm run seed:check` vérifie tout **sans base** : fichiers, tailles, nettoyage, liens cassés.

**36 templates importés.** Quatre archives reçues étaient protégées par mot de passe et n'ont pas pu être lues : `calcul`, `card_hover`, `music__codingtemplate`, `netflix__codingtemplate`. Leurs fiches sont prêtes dans le manifeste : dépose une version **sans mot de passe** dans `seed/templates/` (même nom) et relance le seed.

`gentelella.zip` et `argon-dashboard-flask-master.zip` sont des versions **allégées** (de 4 800 à 291 fichiers pour gentelella, de 2 977 à 306 pour argon : icônes en double, langues, sources `.scss`, docs). Gentelella garde tout ce que ses pages utilisent. Argon et le forum PHP n'ont pas d'aperçu (ils demandent Python / PHP) : ils s'affichent en « code seul ».

## Espace admin (`/admin`)

- **Ajouter** : glisser-déposer d'une archive ZIP, dossier, fichiers ou code collé (HTML / CSS / JS).
- **Signature** : initiales, nom affiché, badge (position, couleurs), commentaire `© initiales`. Elle est ajoutée **à la lecture** : la changer met à jour tous les templates immédiatement (aperçu, code copié, ZIP).
- **Mentions à retirer** : commentaires, liens et crédits contenant ces termes sont supprimés ; un nom cité dans un texte est remplacé par ton nom. Le bouton « Appliquer… » re-nettoie les templates déjà importés.
- Les **licences open source** (Bootstrap, jQuery, Font Awesome…) sont conservées : elles sont obligatoires.

## Limites

- Vercel limite une requête à 4,5 Mo : à l'import par l'admin, les fichiers de plus de **2,5 Mo** sont ignorés (le seed accepte jusqu'à 4 Mo).
- Les fichiers sont stockés dans Postgres (≈ 63 Mo pour le seed) : surveille le quota de ta base.
- Les liens en chemin absolu (`/images/x.png`) dans un template ne sont pas réécrits.

## Sécurité

Le code des templates s'exécute dans une iframe **sandbox** (et la réponse porte un `Content-Security-Policy: sandbox`) : il n'a accès ni au site ni à la session admin. Cookie admin `HttpOnly` + `SameSite=Strict`, en-tête personnalisé exigé sur toute écriture (anti-CSRF).

## Tests

`npm test` : ZIP, nettoyage, signature, coloration, authentification, import, puis `seed:check`.
