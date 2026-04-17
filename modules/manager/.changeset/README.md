<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Changesets

This folder holds changesets for `@focusmcp/cli-manager`. Each PR that introduces a user-facing change must include a changeset (`pnpm changeset`).

- Mode: single package (`@focusmcp/cli-manager`) — one version, one tag per release.
- `baseBranch: develop` — changesets target `develop`, then get promoted to `main` at release time.
- `access: public` — the manager is intended for public npm distribution (Phase 2: `npx @focusmcp/cli-manager`).

Format: Markdown with frontmatter describing the bump (patch/minor/major).

Reference: https://github.com/changesets/changesets
