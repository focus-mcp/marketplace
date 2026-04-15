<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

## Summary

What does this PR change and why? If linked to an issue: `Closes #N`.

## Type

- [ ] New brick (`bricks/<name>/`)
- [ ] Update to an existing brick
- [ ] External brick added/updated in `external_bricks.json`
- [ ] Tooling / CI / docs
- [ ] Schema (`schemas/catalog/**`) — requires version bump + ADR

## Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (coverage ≥ 80%)
- [ ] `pnpm build:catalog` succeeds (schema validation green)
- [ ] Conventional Commits respected
- [ ] Changeset added (`pnpm changeset`) if a brick was modified
- [ ] SPDX headers present in new files
- [ ] REUSE compliance OK

## Brick submission (if applicable)

- [ ] Name follows `focus-<domain>` convention and is kebab-case
- [ ] Atomic scope (single domain, no catch-all)
- [ ] `mcp-brick.json` manifest present and valid
- [ ] Tests present (coverage ≥ 80%)
- [ ] License is MIT-compatible

## Test plan

Describe how the changes were tested (commands run, fixtures, manual checks).
