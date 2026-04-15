<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# AGENTS.md

> Instructions pour les agents AI travaillant sur ce dépôt (Claude Code, Cursor, Codex, Copilot, Gemini CLI, Aider, etc.).
> Format inspiré de la convention émergente [agents.md](https://agentsmd.net/).

## Projet

**FocusMCP marketplace** — catalogue officiel de briques MCP atomiques. Troisième dépôt de l'écosystème FocusMCP (après `core` et `client`). Site : https://focusmcp.dev.
Lire [PRD.md](./PRD.md) pour la vision complète du catalogue (schéma, distribution, signature, gouvernance).

## Stack

- **Node.js ≥ 22** (LTS), **pnpm ≥ 10**, **TypeScript 5.7+** strict
- **ESM only** (`"type": "module"`)
- Monorepo **pnpm workspaces** : `bricks/*` + `scripts`
- Tests : **Vitest** (unit), **ajv** pour la validation du schéma
- Lint/format : **Biome 2.x**
- Changesets en mode **independent** — chaque brique a sa propre version + tag `<brick-name>@x.y.z`
- **Pas de publication npm** au MVP — distribution via GitHub Releases (tarballs) + `catalog.json` sur GitHub Pages

## Organisation des fichiers

Toutes les configs outils sont regroupées dans **`config/`** (vitest, commitlint, lint-staged, gitleaks). À la racine on garde uniquement les conventions strictes (README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, AGENTS, PRD, package.json, pnpm-workspace.yaml, tsconfig.json, dotfiles).

Générateur du catalogue et tests : **`scripts/`** (workspace dédié).

## Règles non-négociables

1. **Atomicité** — 1 brique = 1 domaine. Pas de brique fourre-tout. Convention `focus-<domaine>`.
2. **TDD strict** — écrire le test AVANT le code (Red → Green → Refactor). Coverage ≥ 80 % global.
3. **Pas de `any`**, pas de `console.log` (sauf dans le générateur de catalogue, qui est un outil CLI).
4. **SPDX header** dans tous les fichiers source : `SPDX-FileCopyrightText: 2026 FocusMCP contributors` + `SPDX-License-Identifier: MIT`.
   Pour les fichiers JSON (sans support de commentaires), créer un fichier jumeau `.license` (convention REUSE).
5. **Imports** : `node:` protocol (`import { readFile } from 'node:fs/promises'`).
6. **Commits** : [Conventional Commits](https://www.conventionalcommits.org/) — types autorisés : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
7. **Pas de feature non demandée** — respecter strictement le périmètre.
8. **Le catalogue n'est jamais committé** — il est généré par CI (`pnpm build:catalog`) et publié sur `gh-pages`.

## Commandes

```bash
pnpm install              # install (frozen lockfile en CI)
pnpm test                 # tests Vitest
pnpm test:watch           # watch mode
pnpm test:coverage        # coverage + thresholds
pnpm typecheck
pnpm lint                 # Biome check
pnpm lint:fix             # Biome auto-fix
pnpm build:catalog        # génère dist/catalog.json, valide contre le JSON Schema
pnpm changeset            # créer un changeset avant de merger
```

## Structure attendue d'une brique locale

```
bricks/<name>/
  mcp-brick.json          # manifeste (name, description, dependencies, tools…)
  package.json            # name: "focus-<name>", version, private: true
  src/
    index.ts              # export principal
    <feature>/
      <feature>.ts
      <feature>.test.ts
  README.md
  LICENSE
```

## Workflow type pour ajouter une brique

1. **Lire** le PRD et ce document.
2. **Ouvrir une issue** « Brick submission » pour discuter du périmètre.
3. **Créer** `bricks/<name>/` avec manifeste + `package.json` + tests.
4. **Red → Green → Refactor** côté code.
5. **`pnpm build:catalog`** pour vérifier que le catalogue généré est valide.
6. **Lint + typecheck + test** : `pnpm lint && pnpm typecheck && pnpm test`.
7. **Changeset** : `pnpm changeset` (scope = nom de la brique).
8. **Commit** Conventional Commits.
9. **PR** vers `develop` (jamais directement sur `main`).

## Git-flow

- Branche de travail : **`develop`** (persistante, jamais supprimée).
- Release : PR `develop → main` ; `main` déclenche le workflow `release.yml`.
- **Ne jamais `--delete-branch` sur la PR develop→main.**

## Sécurité

- **Aucun secret** dans le code (gitleaks bloque en pre-commit et CI).
- **Pas de `eval`**, pas de `new Function()`.
- Toute entrée externe (manifeste, `external_bricks.json`) est validée contre le JSON Schema avant d'entrer dans le catalogue.

## Remote Git

- **origin** : `git@github.com:focus-mcp/marketplace.git`.

## Documentation à consulter en priorité

1. [PRD.md](./PRD.md) — vision et format du catalogue
2. [CONTRIBUTING.md](./CONTRIBUTING.md) — workflow de soumission d'une brique
3. [schemas/catalog/v1.json](./schemas/catalog/v1.json) — structure exacte du catalogue
4. [scripts/build-catalog.ts](./scripts/build-catalog.ts) — générateur de référence
