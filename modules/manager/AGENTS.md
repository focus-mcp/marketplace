<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# AGENTS.md

> Instructions for AI agents working on this repository (Claude Code, Cursor, Codex, Copilot, Gemini CLI, Aider, etc.).
> Format inspired by the emerging [agents.md](https://agentsmd.net/) convention.

## Project

**FocusMCP cli-manager** — optional web dashboard that observes a running `@focusmcp/cli` via its admin HTTP API. Fifth repo of the FocusMCP ecosystem (after `core`, `client`, `marketplace`, `cli`). Site: https://focusmcp.dev.
Read [PRD.md](./PRD.md) for the complete vision (scope, architecture, distribution).

## Stack

- **Node.js ≥ 22** (LTS), **pnpm ≥ 10**, **TypeScript 5.7+** strict
- **ESM only** (`"type": "module"`)
- **Svelte 5** (runes: `$state`, `$props`, `$derived`, `$effect`) + **SvelteKit** with `adapter-static`
- **Tailwind CSS** for styling
- Tests: **Vitest** (unit, `src/lib/**/*.ts` only — `.svelte` files are typechecked by `svelte-check`)
- Lint/format: **Biome 2.x** for `.ts`/`.js`/`.json`/`.md`; `svelte-check` for `.svelte`
- Changesets (single package), npm scope `@focus-mcp`

## File layout

All tool configs live in **`config/`** (vitest, commitlint, lint-staged, gitleaks). The repo root keeps only the strict conventions (README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, AGENTS, PRD, package.json, tsconfig.json, svelte.config.js, vite.config.ts, dotfiles).

```
src/
  app.html               # SvelteKit HTML shell
  app.css                # Tailwind entry
  app.d.ts               # SvelteKit ambient types
  routes/
    +layout.svelte       # shared shell (header/nav/footer)
    +layout.ts           # prerender = true
    +page.svelte         # home
    bricks/+page.svelte
    logs/+page.svelte
    metrics/+page.svelte
    graph/+page.svelte
  lib/
    api-client.ts        # admin HTTP API contract (stub)
    api-client.test.ts
static/                  # assets copied as-is
```

## Non-negotiable rules

1. **Observation only** — this repo never writes to the CLI or to a filesystem. Brick install, remove, configure all happen in the CLI. The manager is read-only.
2. **No `@focusmcp/core` dependency** — the manager only speaks HTTP to `@focusmcp/cli`. Never import from `@focusmcp/core` here.
3. **Strict TDD** for logic in `src/lib/**/*.ts` — write the test BEFORE the code (Red → Green → Refactor). Coverage ≥ 80 % on that surface.
4. **No `any`**, no `console.log`. Use `unknown` + narrowing when necessary.
5. **Static bundle** — every route has `export const prerender = true;` (directly or via `+layout.ts`). No SSR. No server-side code. No `+page.server.ts`, no `+server.ts`.
6. **SPDX header** in every source file: `SPDX-FileCopyrightText: 2026 FocusMCP contributors` + `SPDX-License-Identifier: MIT`. For JSON files (no comment support), create a sibling `.license` file (REUSE convention).
7. **Imports**: `node:` protocol for Node built-ins in scripts/configs.
8. **Svelte 5 runes only** — `$state`, `$props`, `$derived`, `$effect`. No legacy reactive declarations (`$:`), no `export let` (use `$props`).
9. **Accessibility baseline** — every interactive component must have ARIA labels, keyboard navigation, and visible focus states. Run manual checks with the keyboard only.
10. **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) — allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
11. **No unsolicited features** — stick strictly to the requested scope.

## Commands

```bash
pnpm install              # install (frozen lockfile in CI)
pnpm dev                  # SvelteKit dev server
pnpm build                # static build into ./build
pnpm preview              # preview the static build
pnpm test                 # Vitest (src/lib/**/*.ts)
pnpm test:watch           # watch mode
pnpm test:coverage        # coverage + thresholds (80%)
pnpm typecheck            # svelte-check
pnpm lint                 # Biome check
pnpm lint:fix             # Biome auto-fix
pnpm changeset            # create a changeset before merging
```

## Standard workflow to add a page / feature

1. **Read** the PRD and this document.
2. **Open an issue** if the scope isn't already tracked.
3. **Write the test first** (for anything in `src/lib`) — Red.
4. **Implement** — Green.
5. **Refactor** — keep it small and composable.
6. **Lint + typecheck + test**: `pnpm lint && pnpm typecheck && pnpm test`.
7. **Build**: `pnpm build` — must succeed on every PR.
8. **Changeset**: `pnpm changeset`.
9. **Commit** with Conventional Commits.
10. **PR** to `develop` (never directly to `main`).

## Git-flow

- Working branch: **`develop`** (persistent, never deleted).
- Release: PR `develop → main`; `main` triggers the `release.yml` workflow.
- **Never `--delete-branch` on the develop→main PR.**

## Security

- **No secrets** in the code (gitleaks blocks in pre-commit and CI).
- **No `eval`**, no `new Function()`.
- The manager holds **no server-side secrets** (fully static). The admin token lives in the user's browser session only.
- CORS is controlled by the CLI; the manager assumes same-origin localhost by default.

## Git remote

- **origin**: `git@github.com:focus-mcp/cli-manager.git`.

## Documentation to read first

1. [PRD.md](./PRD.md) — vision, architecture, roadmap (French)
2. [CONTRIBUTING.md](./CONTRIBUTING.md) — contribution workflow
3. [src/lib/api-client.ts](./src/lib/api-client.ts) — the admin HTTP API contract
