<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# CLAUDE.md — focus-mcp/marketplace

> Auto-loaded by Claude Code (and any agents.md-compatible tool) when working in this repo.
> This file is the **source of truth for AI agent behaviour** on this project. It replaces the
> former `~/.claude/projects/**/memory/` system — do not recreate that folder.

## Projet

**FocusMCP** — orchestrateur MCP. Reduces AI-agent context from 200k to ~2k tokens by composing
**briques** (atomic MCP modules). Site [focusmcp.dev](https://focusmcp.dev).

Ce repo = **catalogue officiel** des briques MCP + hébergement monorepo des briques officielles
(`bricks/*`) + modules internes (`modules/*`, dont le `manager` = dashboard web optionnel).
Le catalogue (`catalog.json`) est généré par `scripts/build-catalog.ts` et publié sur gh-pages.

## Écosystème (4 repos actifs + 1 archivé)

| Repo | Rôle |
|---|---|
| `focus-mcp/core` | Monorepo lib TS — Registry + EventBus + Router + SDK + Validator + marketplace resolver. |
| `focus-mcp/cli` | `@focus-mcp/cli` — stdio MCP, brick manager, publié npm. |
| `focus-mcp/marketplace` (ici) | Catalogue + bricks + modules (manager). Catalog sur gh-pages. |
| `focus-mcp/client` | **archivé** — ex desktop Tauri, Phase 2. |

## Architecture

```
marketplace/
├── bricks/<name>/            # briques officielles (pnpm workspace)
│   ├── mcp-brick.json        # manifeste
│   ├── package.json          # @focus-mcp/<name>
│   └── src/
├── modules/manager/          # dashboard web SvelteKit static (Phase 2) — seul module actuellement
├── external_bricks.json      # refs URL / git-subdir (manuel)
├── schemas/catalog/v1.json   # JSON Schema du catalogue
├── scripts/
│   ├── build-catalog.ts      # générateur, écrit dist/catalog.json
│   └── build-catalog.test.ts
└── dist/catalog.json         # sortie locale du générateur (non commitée) ;
                              # le workflow release assemble un `publish/` qui est poussé sur gh-pages
```

**Pipeline release** (Changesets independent mode) :
1. PR merge sur `develop` avec un changeset
2. Sync `develop → main` via PR
3. Workflow `release.yml` sur main : Changesets bump versions, tag `@focus-mcp/<name>@x.y.z`
   (format scoped npm natif de Changesets), GitHub Release par package bumpé, `pnpm build:catalog`,
   publish sur gh-pages (le workflow assemble un dossier `publish/` qui devient la racine de
   `gh-pages` via `peaceiris/actions-gh-pages`).

**Domaine custom à configurer (Phase 2)** : `marketplace.focusmcp.dev` → gh-pages (CNAME +
DNS + GitHub Pages settings). Actuellement : `https://focus-mcp.github.io/marketplace/catalog.json`.

## Règles non-négociables (tous repos FocusMCP)

1. **TDD strict** — tests AVANT le code. Coverage ≥ **80 %** global.
2. **Périmètre strict** — pas de features non demandées.
3. **Standards pro** — TS strict (pas de `any`), Biome (indent 4 spaces), Conventional Commits,
   husky + lint-staged, semver, SPDX headers (REUSE, via `.license` sidecar pour JSON), Changesets.
4. **Imports** : `node:` protocol.
5. **Public-facing content en anglais** — critique ici car le catalogue expose des contenus lus par
   des tiers :
   - `.github/` (workflows, templates, renovate)
   - PR/issue titles + bodies, commit messages
   - **`mcp-brick.json`** : `description`, `tools[].description`, `tools[].inputSchema.properties.*.description`
   - **`bricks/<name>/README.md`** (lu dans le client FocusMCP au browse)
   - **Entries Changesets** (`.changeset/*.md`)
   - Docs contributor-facing (README, AGENTS, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)
   - Règle "à partir de maintenant" : tout nouveau contenu public en anglais ; les docs
     existantes peuvent rester en français jusqu'à leur prochaine réécriture substantielle.
   - Exceptions permanentes : `PRD.md`, `CLAUDE.md` (ce fichier) et contenus internes modules
     restent en français.
6. **Git-flow strict** — `develop` permanente.
7. **npm orgs** — `focusmcp` + `focus-mcp` réservées. Scope canonique `@focus-mcp/*`. Distribution
   via npm / GitHub Packages (`@focus-mcp/<name>`), référencées dans `catalog.json` avec
   `source: { type: "npm", package: "@focus-mcp/<name>" }`. Les tarballs GitHub Release ne sont
   plus le mode de distribution principal.
8. **Rulesets GitHub** — `main protection` cible UNIQUEMENT `refs/heads/main` ;
   `develop protection` cible UNIQUEMENT `refs/heads/develop`. Ne pas mélanger (Code Quality
   = pending éternel sur non-default branch).

## Dans ce repo (marketplace)

**Stack** : Node ≥ 22, pnpm ≥ 10, TS 5.7+, ESM, Vitest, Biome 2.4+, Changesets independent,
Ajv 8 (pour validation du schema). Pour `modules/manager/` : SvelteKit 2 + Svelte 5 runes +
Tailwind 4 + adapter-static.

**Layout pnpm-workspace.yaml** :
```yaml
packages:
  - 'bricks/*'
  - 'modules/*'
  - 'scripts'
```

**Briques dans le catalogue (67 total)** :
- `bricks/echo/` — hello-world brique pour smoke-test le pipeline (tools: `echo_say`)
- **Files** : read-file, write-file, list-dir, search-files, watch-file, …
- **Code Intel** : code-search, symbol-lookup, ast-query, references, …
- **Context** : summarize, chunk-context, extract-context, filter-context, …
- **Git** : git-log, git-diff, git-blame, git-status, …
- **Web** : fetch-url, scrape-page, search-web, …
- **Database** : query-sql, list-tables, describe-schema, …
- **AI** : embed, classify, generate, …
- **Utilities** : format-json, parse-csv, convert-units, …

**Modules installés** :
- `modules/manager/` — dashboard web static SvelteKit. Purement observationnel, consomme
  l'admin API HTTP de la CLI. Package: `@focus-mcp/manager`. Publish Phase 2.

**Conventions bricks** :
- Nom = kebab-case **nu** (ex: `echo`, `indexer`, `memory`, `sf-router`). **Pas de préfixe `focus-`**.
- Package npm = `@focus-mcp/<name>` (scope canonique).
- Manifeste `mcp-brick.json` : pas de `version` (source de vérité = `package.json`).
- Source de la brique (catalogue) : `source: { type: "local", path: "bricks/<name>" }` (interne),
  `{ type: "url", url, sha? }` (external_bricks.json), ou `{ type: "npm", package: "@focus-mcp/<name>" }`
  (distribution npm — mode principal).
- **Multi-source** : le fichier de config utilisateur peut référencer des URLs de catalogues
  externes (catalogues tiers ou privés), en plus du catalogue officiel.

**Commandes** :
```bash
pnpm install
pnpm test            # Vitest (bricks + scripts/build-catalog)
pnpm test:coverage
pnpm typecheck
pnpm lint / lint:fix
pnpm build           # build tous les bricks et modules avec `build` script
pnpm build:catalog   # génère dist/catalog.json, valide contre schemas/catalog/v1.json
pnpm changeset       # required avant toute PR qui touche une brique ou un module
```

## Workflow pour une feature

1. Lire PRD.md + ce fichier
2. Feature branch depuis `develop`
3. Red → Green → Refactor (TDD strict)
4. Pour une brique : scaffolding `bricks/<name>/{mcp-brick.json, package.json, src/, README.md}` +
   tests Vitest + changeset
5. Pour un module : scaffolding `modules/<name>/` (SvelteKit ou autre selon besoin) + changeset
6. `pnpm test:coverage && pnpm typecheck && pnpm lint && pnpm build:catalog`
7. Conventional Commits
8. PR vers `develop` + résoudre threads Copilot avant merge

## Quality gates (PR doit passer tout ça)

- `Lint (Biome)` — `pnpm lint`
- `Typecheck` — `pnpm typecheck`
- `Test + Coverage` — `pnpm test:coverage` (thresholds 80 %)
- `REUSE compliance` — tous les fichiers ont un SPDX
- `Gitleaks (secret scan)` — pas de secret commité
- `Build catalog` — `pnpm build:catalog` (validation schema stricte)
- `Build modules` — `pnpm build` (manager static build)
- `CodeQL` — security scan
- `Commitlint` — Conventional Commits

## Sécurité

- Aucun secret commité (gitleaks CI + pre-commit)
- Schema JSON strict (ajv) sur toutes les briques avant publication
- Briques reviewées humainement avant merge (atomicité, pas de kitchen-sink)
- MIT-compatible licenses only

## Documentation à lire en priorité

1. [PRD.md](./PRD.md) — vision, architecture, roadmap catalogue
2. [AGENTS.md](./AGENTS.md) — instructions cross-agents
3. [CONTRIBUTING.md](./CONTRIBUTING.md) — workflow de soumission de brique
4. [schemas/catalog/v1.json](./schemas/catalog/v1.json) — format exact du catalogue
5. [scripts/build-catalog.ts](./scripts/build-catalog.ts) — générateur de référence
