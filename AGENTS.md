<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# AGENTS.md

> This file is the **single source of truth for AI agent behavior** on this project.
> It follows the [agents.md](https://agents.md) standard and is read by Claude Code,
> Cursor, Aider, GitHub Copilot, and any other AI coding tool.
>
> Humans, this file is for you too — it documents our conventions and expectations.

## Project

**FocusMCP marketplace** — official catalog of atomic MCP bricks. Third repo of the FocusMCP ecosystem (after `core` and `cli`). Site: https://focusmcp.dev.
Read [VISION.md](./VISION.md) for the complete catalog vision (schema, distribution, signing, governance).

68 bricks published at v1.0.0 + `lastversion` added in v1.1.0. All bricks are published as `@focus-mcp/brick-<name>` on npmjs.org.

Catalog is served at:
`https://focus-mcp.github.io/marketplace/catalog.json`

Served from the `gh-pages` branch — auto-refreshed by the `stable-publish`
workflow on every release.

## Ecosystem

| Repo | Role |
|---|---|
| `focus-mcp/core` | TS monorepo lib — Registry + EventBus + Router + SDK + Validator + marketplace resolver. |
| `focus-mcp/cli` | `@focus-mcp/cli` — stdio MCP, brick manager, published on npm. |
| `focus-mcp/marketplace` (here) | Official catalog + `bricks/*` + `modules/*`. Catalog served from `gh-pages` (auto-deployed on every release). |
| `focus-mcp/client` | **archived** — former Tauri desktop app, Phase 2. |

## Stack

- **Node.js ≥ 22** (LTS), **pnpm ≥ 10**, **TypeScript 5.7+** strict
- **ESM only** (`"type": "module"`)
- Monorepo **pnpm workspaces**: `bricks/*` + `modules/*` + `scripts`
- Tests: **Vitest** (unit), **ajv** for schema validation
- Lint/format: **Biome 2.x** (4-space indent)
- Each brick has its own version + tag `@focus-mcp/brick-<name>@x.y.z`
- Bricks published to **npmjs.org** under scope `@focus-mcp`
- `modules/manager/`: SvelteKit 2 + Svelte 5 runes + Tailwind 4 + adapter-static

## File layout

All tool configs live in **`config/`** (vitest, commitlint, lint-staged, gitleaks). The repo root keeps only the strict conventions (README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, AGENTS, PRD, package.json, pnpm-workspace.yaml, tsconfig.json, dotfiles).

Catalog generator and its tests: **`scripts/`** (dedicated workspace).

```
marketplace/
├── bricks/<name>/            # official bricks (pnpm workspace)
│   ├── mcp-brick.json        # manifest (no version field — source of truth is package.json)
│   ├── package.json          # @focus-mcp/brick-<name>
│   └── src/
├── modules/manager/          # static SvelteKit web dashboard (Phase 2) — only module currently
├── external_bricks.json      # URL / git-subdir refs (manually maintained)
├── schemas/catalog/v1.json   # JSON Schema for the catalog
├── scripts/
│   ├── build-catalog.ts      # generator — writes dist/catalog.json
│   └── build-catalog.test.ts
├── dist/catalog.json         # local generator output (not committed)
└── publish/catalog.json      # assembled by CI; auto-deployed to gh-pages branch on every release
```

**pnpm-workspace.yaml packages:**
```yaml
packages:
  - 'bricks/*'
  - 'modules/*'
  - 'scripts'
```

## Bricks in the catalog (68 total + lastversion in v1.1.0)

- `bricks/echo/` — hello-world brick for smoke-testing the pipeline (tools: `echo_say`)
- **Files**: fileread, filewrite, filelist, fileops, filesearch, filediff, smartread, multiread
- **Code Intel**: treesitter, symbol, callgraph, depgraph, cache, outline, refs
- **Context**: overview, compress, tokenbudget, smartcontext, contextpack
- **Shell & Execution**: shell, sandbox, batch
- **Code Editing**: rename, codeedit, inline
- **Reasoning**: thinking, planning, decision
- **Search**: textsearch, fts, semanticsearch
- **Knowledge**: knowledge, graphbuild, graphquery, graphcluster, graphexport
- **Orchestration**: dispatch, parallel, debate, review, research, agent, share, task
- **Analytics**: metrics, heatmap, savings
- **Utilities**: format, validate, convert, diagram, routes
- **Workflows**: onboarding, fullaudit, autopilot
- **Version intelligence**: lastversion (v1.1.0)

## Brick conventions

- Name = bare kebab-case (e.g. `echo`, `indexer`, `memory`, `sf-router`). **No `focus-` prefix.**
- npm package = `@focus-mcp/brick-<name>` (canonical scope).
- `mcp-brick.json` has no `version` field — source of truth is `package.json`.
- Catalog source types:
  - `{ type: "local", path: "bricks/<name>" }` — internal bricks
  - `{ type: "url", url, sha? }` — via external_bricks.json
  - `{ type: "npm", package: "@focus-mcp/brick-<name>" }` — npm distribution (main mode)
- **Multi-source**: the user config file can reference external catalog URLs (third-party or private catalogs), in addition to the official catalog.

## Non-negotiable rules

1. **Atomicity** — 1 brick = 1 domain. No kitchen-sink bricks. Name = bare kebab-case domain (e.g. `echo`, `indexer`, `sf-router`). **No `focus-` prefix.**
2. **Strict TDD** — write the test BEFORE the code (Red → Green → Refactor). Coverage ≥ 80% global.
3. **No `any`**, no `console.log` (except in the catalog generator, which is a CLI tool).
4. **SPDX header** in every source file: `SPDX-FileCopyrightText: 2026 FocusMCP contributors` + `SPDX-License-Identifier: MIT`.
   For JSON files (no comment support), create a sibling `.license` file (REUSE convention).
5. **Imports**: `node:` protocol (`import { readFile } from 'node:fs/promises'`).
6. **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) — allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
7. **No unsolicited features** — stick strictly to the requested scope.
8. **The catalog is never committed directly** — it is generated by CI (`pnpm build:catalog`) and published via `stable-publish.yml` to the `publish/` folder on `main`.
9. **npm scope is `@focus-mcp`** (with hyphen). Never write `@focusmcp` (no hyphen) in new code or docs.
10. **Public-facing content in English** — especially critical here because catalog content is read by third parties: `mcp-brick.json` (`description`, `tools[].description`, `tools[].inputSchema.properties.*.description`), `bricks/<name>/README.md`, contributor-facing docs (README, AGENTS, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT), `.github/` files, PR/issue titles + bodies, commit messages.
11. **MIT-compatible licenses only** for all bricks.

## GitHub Rulesets

Every active repo in the FocusMCP org has two rulesets — do not modify without discussion:

- **`main protection`** — targets `refs/heads/main` ONLY: `required_status_checks`, `pull_request`, `code_scanning` (CodeQL), `code_quality`, `required_linear_history`, `deletion`, `non_fast_forward`. **No `required_signatures`** (AI-assisted commits are not signed).
- **`develop protection`** — targets `refs/heads/develop` ONLY: `deletion`, `non_fast_forward`, `required_linear_history`, `pull_request` (no `code_quality` — this check is not available on non-default branches).
- **Known pitfall**: NEVER include `develop` in the targets of "main protection".

## Commands

```bash
pnpm install              # install (frozen lockfile in CI)
pnpm test                 # Vitest
pnpm test:watch           # watch mode
pnpm test:coverage        # coverage + thresholds
pnpm typecheck
pnpm lint                 # Biome check
pnpm lint:fix             # Biome auto-fix
pnpm build                # build all bricks and modules (runs each package's build script)
pnpm build:catalog        # builds dist/catalog.json, validates against the JSON Schema
```

## Quality gates (every PR must pass)

- `Lint (Biome)` — `pnpm lint`
- `Typecheck` — `pnpm typecheck`
- `Test + Coverage` — `pnpm test:coverage` (thresholds 80%)
- `REUSE compliance` — every file has an SPDX header
- `Gitleaks (secret scan)` — no committed secrets
- `Build catalog` — `pnpm build:catalog` (strict schema validation)
- `Build modules` — `pnpm build` (manager static build)
- `CodeQL` — security scan
- `Commitlint` — Conventional Commits

## Standard workflow to add a brick

1. **Read** [VISION.md](./VISION.md) and this document.
2. **Open a "Brick submission" issue** to discuss scope.
3. **Create** `bricks/<name>/` with manifest + `package.json` + tests.
4. **Red → Green → Refactor** in the code.
5. **`pnpm build:catalog`** to verify the generated catalog is valid.
6. **Lint + typecheck + test**: `pnpm lint && pnpm typecheck && pnpm test`.
7. **Commit** with Conventional Commits.
8. **PR** to `develop` (never directly to `main`).

## Expected layout of a local brick

```
bricks/<name>/
  mcp-brick.json          # manifest (name, description, dependencies, tools...)
  package.json            # name: "@focus-mcp/brick-<name>", version, type: "module"
  src/
    index.ts              # main export
    <feature>/
      <feature>.ts
      <feature>.test.ts
  README.md
  LICENSE
```

## Release pipeline

1. PR merge to `develop`
2. `dev-publish.yml` on `develop`: publishes bricks with `@dev` tag on npmjs.org
3. Sync `develop → main` via PR
4. `stable-publish.yml` on `main`: publishes bricks with `@latest` tag on npmjs.org, generates `publish/catalog.json`, and auto-deploys it to the `gh-pages` branch (the user-facing catalog URL).

Changesets handles the version bumps in the develop→main sync PR. The catalog is served from `https://focus-mcp.github.io/marketplace/catalog.json` (auto-refreshed on every stable release).

## Git-flow

- **origin**: `git@github.com:focus-mcp/marketplace.git`.
- Working branch: **`develop`** (persistent, never deleted).
- Dev publish: `dev-publish.yml` triggers on `develop` → publishes bricks with `@dev` tag on npm.
- Stable publish: `stable-publish.yml` triggers on `main` → publishes bricks with `@latest` tag on npm and updates `publish/catalog.json`.
- **Never `--delete-branch` on the develop→main PR.**

## Security

- **No secrets** in the code (gitleaks blocks in pre-commit and CI).
- **No `eval`** and no dynamic code construction — prefer static imports and explicit interfaces.
- Every external input (manifest, `external_bricks.json`) is validated against the JSON Schema before landing in the catalog.
- Bricks are human-reviewed before merge (atomicity check, no kitchen-sink).

## Documentation to read first

1. [VISION.md](./VISION.md) — vision and catalog principles
2. [CONTRIBUTING.md](./CONTRIBUTING.md) — brick submission workflow
3. [schemas/catalog/v1.json](./schemas/catalog/v1.json) — exact catalog structure
4. [scripts/build-catalog.ts](./scripts/build-catalog.ts) — reference generator
