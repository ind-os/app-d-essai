# App du client

Le modèle d'une app écrite par le client et installée dans l'espace d'Indos, au même rang qu'une app du catalogue : ses outils pour Claude, son écran dans la barre, ouverte à l'équipe ou à des groupes. Elle prend la bibliothèque d'Indos sur npm, `@indos/bibliotheque`, sous licence MIT.

Ce que fait le modèle : des entrées en texte court, à chaque personne les siennes, dans sa base. Deux outils, `ajouter` et `lister` (25 par page), les mêmes pour Claude et pour l'écran « Entrées ».

## Créer le dépôt

1. Copier ce dossier à la racine d'un dépôt neuf.
2. Dans `module.json`, remplacer `nom` (`app-du-client`) par le nom de l'app, en minuscules, chiffres et tirets : c'est son chemin, `https://<domaine>/<nom>`, et son nom dans `serveur.json`. Puis `titre`, et les `ecrans`.
3. `npm install` : npm installe la bibliothèque et, avec elle, React, Vite, TanStack et les outils de test, à ses versions exactes. Le `package.json` ne les liste pas.
4. Commiter `package-lock.json`.

## Le dépôt

- `module.json` : le manifeste. `nom`, `titre`, `version` (celle que montre l'écran ; l'app installée est son commit), `dependances.core`, la borne du core que demande l'app (`>=1.8 <3` pour une app à page), `ecrans`, `[{ "nom", "titre", "pour" }]`, et facultatifs `pour: "proprietaire"`, qui la réserve au propriétaire jusqu'à ce qu'il l'ouvre dans « Équipe », `reglages: true`, et `appelle`.
- `appelle` : la liste des apps dont l'app appelle les outils, comme `["fichiers"]` pour garder des fichiers. Le kit lui passe alors `CLE_D_APPEL`, et l'app les appelle par `creerLAppel` de `@indos/bibliotheque/appeler`. Sans besoin, ne pas le mettre.
- `src/` : le serveur. `demarrer.ts` ouvre la base, applique les migrations, puis écoute ; `serveur.ts` route le MCP, les outils de l'écran, la page et la racine ; `outils.ts`, les outils.
- `migrations/` : les fichiers `.sql`, appliqués au démarrage dans l'ordre de leur nom, chacun une fois. Une migration publiée ne se modifie plus : la suivante la corrige.
- `espace/` : la page de l'espace, en React. `page.tsx` la lance ; `routes.ts` déclare un écran par route, `/<nom>/<écran>` ; `ecrans/`, un écran par fichier ; `requetes/`, ses lectures par les outils.
- `tests/` : le serveur, avec le faux core et une base d'essai en mémoire ; l'écran, par Vitest ; les sources de la page, sans HTML brut.
- `USAGE.md` : le texte d'usage, écrit pour Claude ; il devient les instructions du MCP de l'app.
- `Dockerfile` : l'image, construite depuis la racine du dépôt. Elle construit la page, puis ne garde que le serveur, ses migrations et la page construite, sans React ni Vite (`npm ci --omit=dev --omit=peer`).
- `.github/workflows/ci.yml` : sur une PR et sur `main`, `npm ci && npm test`, puis `docker build .`.

## Commandes

- `npm test` : construire la page, vérifier les types du serveur et de la page, lancer les tests de Node, puis ceux de l'écran.
- `npm run build` : construire la page dans `dist/`.
- `ADRESSE=http://localhost:3000/<nom> DATABASE_URL=postgres://… npm start` : lancer l'app sur le port 3000, la page construite, avec une Postgres locale.
- `npm run dev` : la page à chaud sur `http://localhost:5173/<nom>/entrees`, dans Chrome ou Firefox, reliée au core de `INDOS_CORE` et à l'app lancée en local dans un autre terminal :
  - relié au banc d'essai : l'app lancée avec `ADRESSE=http://localhost:5173/<nom> CORE_ADRESSE=https://essai-sources.indos.ch`, puis `INDOS_CORE=https://essai-sources.indos.ch npm run dev` ;
  - relié à un core local, dont l'`ADRESSE` est en `http://localhost:<port>` et où l'app est déclarée avec le lien `http://localhost:5173/<nom>` : la même chose avec `http://localhost:<port>`.

## Ce que le kit attend

Le kit d'Indos installe l'app sur le serveur au commit choisi :

- `module.json` et `Dockerfile` à la racine du dépôt. Le kit lit le manifeste au commit, refuse un manifeste hors de forme avant tout geste, puis construit l'image sur le serveur, avec l'argument `GIT_SHA`. Le `Dockerfile` déclare un seul port (`EXPOSE`) et une sonde (`HEALTHCHECK`).
- L'app est servie à `https://<domaine>/<nom>` ; elle reçoit ses routes avec ou sans ce chemin, et répond 200 sur `/sante`.
- Les variables : `DATABASE_URL`, sa base dans la Postgres du serveur ; `CLE`, sa clé, 32 octets en base64 ; `ADRESSE`, `https://<domaine>/<nom>` ; `CORE_ADRESSE`, le core ; `CLE_D_APPEL`, si le manifeste déclare `appelle`.
- L'app garde tout dans sa base, sans volume : le kit la sauvegarde chaque nuit.

## Monter la bibliothèque

La note des versions de la bibliothèque (`node_modules/@indos/bibliotheque`, et sa page sur npm) dit ce que change chaque version. Une version qui demande un geste dans l'app a sa rubrique « Ruptures » : le geste, les versions exactes de React, Vite et TanStack à reprendre, et le core que demande une majeure, à reporter dans `dependances.core`. Monter, c'est changer la version de `@indos/bibliotheque` dans `package.json`, `npm install`, faire les gestes de la rubrique, puis `npm test`.
