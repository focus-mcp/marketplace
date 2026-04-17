<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

## Summary

What does this PR change and why? If linked to an issue: `Closes #N`.

## Type

- [ ] New feature / page (Svelte route or component)
- [ ] Update to an existing feature
- [ ] API client / types (`src/lib/api-client.ts`)
- [ ] Tooling / CI / docs
- [ ] Styling / Tailwind

## Checklist

- [ ] `pnpm lint` passes (Biome on `.ts`/`.js`/`.json`)
- [ ] `pnpm typecheck` passes (svelte-check on `.svelte`)
- [ ] `pnpm test` passes (coverage ≥ 80% on `src/lib/**/*.ts`)
- [ ] `pnpm build` succeeds (SvelteKit static build)
- [ ] Conventional Commits respected
- [ ] Changeset added (`pnpm changeset`) if user-facing
- [ ] SPDX headers present in new files (`.license` sidecar for JSON)
- [ ] REUSE compliance OK
- [ ] Accessibility baseline (ARIA labels, keyboard nav) for new components
- [ ] No direct backend / filesystem access (manager is pure HTTP client)

## Test plan

Describe how the changes were tested (commands run, browser checks, manual QA).
