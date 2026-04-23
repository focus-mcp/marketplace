<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP — cli-manager

> **Optional web dashboard for the FocusMCP CLI.**
>
> [focusmcp.dev](https://focusmcp.dev) · [PRD](./PRD.md) · [Core](https://github.com/focus-mcp/core) · [Marketplace](https://github.com/focus-mcp/marketplace)

This repository is the **fifth pillar** of FocusMCP, after `core` (the TypeScript library), `client` (the Tauri app), `marketplace` (the catalog of atomic MCP bricks), and `cli` (the command-line orchestrator).

The **cli-manager** is a **purely observational** web dashboard that connects to a running `@focusmcp/cli` through its admin HTTP API. It is **not required** to run FocusMCP — all brick management (install, remove, enable, configure) stays in the CLI. The manager is the "glass pane" on top of a live orchestrator.

## Status

**Scaffold only — Phase 2.** The CLI's admin HTTP API is not shipped yet; this repo contains the tooling, project structure, and empty Svelte routes so that feature work can start as soon as the API lands. Features (bricks listing, metrics, logs, dependency graph) are all deferred — see [PRD.md](./PRD.md).

## What the manager does (planned)

- **Bricks** — live listing of loaded bricks with status, version, dependencies.
- **Metrics** — latency, counters, errors, guards triggered, in real time.
- **Logs** — EventBus stream over SSE, filterable by brick and severity.
- **Graph** — interactive dependency DAG of the loaded bricks.

All of these are **read-only**. The CLI remains the only way to change the orchestrator's state.

## Architecture

```
Browser (user)
    │ HTTP + SSE
    ▼
cli-manager (static bundle, prerendered SvelteKit)
    │ fetch(baseUrl + token)
    ▼
@focusmcp/cli with `--admin-api` enabled
```

The manager does **not** depend on `@focusmcp/core`. Its only link to the FocusMCP runtime is the CLI's admin HTTP API — it could be replaced by any other compatible server.

## Distribution (Phase 2)

- `npx @focusmcp/cli-manager` — starts a tiny static server and opens the browser.
- Optional hosted version at `manager.focusmcp.dev` — also a static bundle, same code.

## Stack

- **SvelteKit** (Svelte 5 runes) with `@sveltejs/adapter-static` — 100% static output, every route prerendered, zero SSR, zero backend.
- **TypeScript** strict (no `any`).
- **Tailwind CSS** for styling.
- **Vitest** + `@vitest/coverage-v8` for unit tests (≥ 80% threshold on `src/lib/**/*.ts`).
- **Biome** for TS/JS/JSON formatting and linting. `.svelte` files are covered by `svelte-check`.
- **husky** + **commitlint** for Conventional Commits.
- **REUSE** (SPDX) + **gitleaks** + **CodeQL** for compliance and security.

## Commands

```bash
nvm use
pnpm install
pnpm dev              # SvelteKit dev server
pnpm build            # static build into ./build
pnpm preview          # preview the static build
pnpm lint             # Biome on .ts/.js/.json/.md
pnpm typecheck        # svelte-check on .svelte + tsc
pnpm test             # Vitest
pnpm test:coverage    # Vitest + coverage thresholds
pnpm reuse            # REUSE compliance (SPDX headers)
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All public-facing content (code comments, docs, commits, PRs, issues) is **English**.

## License

[MIT](./LICENSE)
