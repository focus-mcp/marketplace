<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP — marketplace

> **Catalogue officiel de briques MCP atomiques pour FocusMCP.**
>
> [focusmcp.dev](https://focusmcp.dev) · [PRD](./PRD.md) · [Core](https://github.com/focus-mcp/core) · [Client](https://github.com/focus-mcp/client)

Ce dépôt est le **troisième pilier** de FocusMCP (après `core` = bibliothèque TypeScript et `client` = app Tauri). Il rassemble :

- un **monorepo pnpm** où chaque dossier `bricks/<name>/` est une brique MCP atomique versionnée indépendamment ;
- un **catalogue JSON** (`catalog.json`) généré automatiquement par CI à partir des manifestes `mcp-brick.json` des briques locales et d'un fichier `external_bricks.json` pour les briques externes référencées ;
- un **JSON Schema** (`schemas/catalog/v1.json`) publié sur GitHub Pages qui décrit le format du catalogue.

## Statut

En développement actif — pré-MVP. Voir [PRD.md](./PRD.md).

## Structure

```
bricks/              — briques officielles (chaque sous-dossier = 1 package workspace)
  <name>/
    mcp-brick.json   — manifeste (nom, description, tools, deps…)
    package.json     — version, nom `focus-<name>`
    src/             — code de la brique
    ...
external_bricks.json — briques externes référencées dans le catalogue
external_bricks/     — (optionnel) fichiers associés
schemas/catalog/     — JSON Schema du catalogue (v1.json)
schemas/examples/    — exemples valides / invalides pour tests
scripts/             — générateur de catalogue (build-catalog.ts)
config/              — commitlint, lint-staged, vitest, gitleaks
.github/             — CI, release, templates, renovate
.focusmcp/           — sortie générée (catalog.json, non committé)
```

## Commandes

```bash
nvm use
pnpm install
pnpm lint            # Biome
pnpm typecheck
pnpm test            # Vitest (générateur + briques)
pnpm build:catalog   # génère dist/catalog.json et valide contre le schema
```

## Versioning

Chaque brique a **sa propre version** (Changesets en mode independent). Les tags prennent la forme `<brick-name>@<version>` (ex. `indexer@0.2.1`). Aucun package n'est publié sur npm au MVP : la distribution se fait via **GitHub Releases** (tarballs) et le `catalog.json` publié sur GitHub Pages.

## Soumettre une brique

1. Ouvre une issue « Brick submission » décrivant ton projet (domaine, motivation, atomicité, licence).
2. Après acceptation, ouvre une PR qui ajoute `bricks/<name>/` (ou une entrée dans `external_bricks.json` si la brique reste hors de ce repo).
3. Respecte [CONTRIBUTING.md](./CONTRIBUTING.md) : convention de nommage `focus-<domaine>`, atomicité 1 brique = 1 domaine, tests, manifeste, SPDX.

## Licence

[MIT](./LICENSE)
