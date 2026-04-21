// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// Biome handles .ts/.js/.json/.md. Svelte files are covered by svelte-check via `pnpm typecheck`
// (Biome does not lint .svelte natively; we therefore only run svelte-check on Svelte changes).
/** @type {import('lint-staged').Configuration} */
export default {
    '*.{ts,js,json,md}': ['biome check --write --no-errors-on-unmatched'],
    '*.{ts,svelte}': () => 'pnpm typecheck',
};
