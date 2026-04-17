<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Contributing to the FocusMCP CLI Manager

Thanks for your interest in the FocusMCP CLI manager. This document describes **how to contribute** and the quality rules we enforce.

## Code of Conduct

All contributors agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Submission process

1. **Open an issue** (bug report or feature request) and wait for a maintainer response.
2. **Open a PR** targeting the `develop` branch (never `main` directly).
3. The PR must pass **the whole CI**: lint, typecheck, tests, REUSE, gitleaks, build.

## Local layout

```
src/
  app.html            # SvelteKit HTML shell
  app.css             # Tailwind entry
  routes/             # SvelteKit file-based routes (prerendered)
  lib/                # TypeScript logic (unit-tested, ≥ 80% coverage)
static/               # static assets copied as-is
config/               # tool configs (vitest, commitlint, lint-staged, gitleaks)
.github/              # CI workflows and templates
```

## Svelte conventions

- **Svelte 5 runes only**: `$state`, `$props`, `$derived`, `$effect`. No legacy `export let`, no `$:` reactive blocks.
- **Composition first**: prefer small, focused components. A page should orchestrate components, not hold all the markup.
- **Strict props typing**: always type `$props()` destructuring with a local interface.
- **Accessibility baseline**:
  - Every interactive element must be reachable and operable with the keyboard.
  - Meaningful `aria-*` attributes on navigation, buttons, form inputs.
  - Visible focus states (don't remove the outline without providing a replacement).
  - Use semantic HTML (`<nav>`, `<main>`, `<button>`, `<form>`, `<label>`).
- **Styling**: Tailwind utility classes. Extract repeated class groups into components, not into arbitrary `@apply` stylesheets.

## Non-negotiable rules

1. **Observation only** — no code path in this repo may mutate the CLI state. Brick management belongs to the CLI.
2. **No `@focusmcp/core` dependency** — the manager is decoupled and only speaks HTTP to the CLI.
3. **No `any`** — use `unknown` + narrowing, or define precise interfaces.
4. **No `console.log`** — use the (future) in-app logging surface or `throw`.
5. **TDD / Coverage ≥ 80 %** on `src/lib/**/*.ts` (unit-testable logic). `.svelte` files are covered by `svelte-check` and future component tests.
6. **SPDX headers** in every source file (`SPDX-FileCopyrightText: 2026 FocusMCP contributors` + `SPDX-License-Identifier: MIT`). For JSON files, create a sibling `.license` file (REUSE convention).
7. **Static only** — every route prerenders (`export const prerender = true;` in `+layout.ts` or the page itself). Do not add `+page.server.ts` or `+server.ts`.
8. **Conventional Commits** — enforced by commitlint (`feat(bricks): ...`, `fix(api-client): ...`).
9. **Changeset required** on every user-facing PR (`pnpm changeset`).

## Quality gates

Before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm reuse      # REUSE compliance (SPDX headers)
```

## Review

Maintainers check:

- Scope alignment with the PRD (observation only, no mutation).
- Svelte 5 idioms (runes, typed props).
- Accessibility baseline.
- Test coverage on `src/lib/**/*.ts`.
- No leakage of `@focusmcp/core` or server-side code.

## Security

Vulnerabilities must be reported **privately** — see [SECURITY.md](./SECURITY.md).
