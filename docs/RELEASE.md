<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Release guide — FocusMCP Marketplace

This document is for **maintainers** only. External contributors do not need to follow this process.

## Overview

The marketplace publishes 68+ individual brick packages under `@focus-mcp/brick-*`. Two publish workflows exist:

| Workflow | Trigger | npm tag |
|----------|---------|---------|
| `dev-publish.yml` | push to `develop` | `dev` |
| `stable-publish.yml` | push to `main` | `latest` |

Versions are managed by [Changesets](https://github.com/changesets/changesets). There is no manual `Version Packages` PR — the CI reads `.changeset/*.md` files and bumps only the listed packages.

## Release order

When a marketplace release depends on a new `@focus-mcp/core` or `@focus-mcp/sdk` version:

1. Release **core** first (see `focus-mcp/core` release guide).
2. Update the `@focus-mcp/sdk` dependency in the affected bricks (if needed).
3. Then release **marketplace**.

## Pre-conditions

Before cutting a stable release:

- `develop` and `main` are aligned (no divergence — run `/sync-status` to check).
- All open PRs blocking the milestone are merged to `develop`.
- CI is green on `develop` (lint, typecheck, tests, catalog build, REUSE, gitleaks).
- At least one `.changeset/*.md` file exists covering the changed bricks.
- No `.changeset/cross-cutting-*.md` unless the release genuinely touches all bricks.

## Using the `/release` skill

```
/release marketplace <bump>
```

Where `<bump>` is `patch`, `minor`, or `major`. The skill:

1. Verifies pre-conditions.
2. Runs `pnpm changeset version` to apply version bumps.
3. Commits `chore: release` to `develop`.
4. Opens a sync PR (`develop` → `main`).
5. CI on `main` runs `stable-publish.yml` → publishes to npm with the `latest` tag.
6. The back-merge workflow re-syncs `main` → `develop`.

## Manual fallback

If the `/release` skill is unavailable or fails:

```bash
# 1. Ensure you are on develop and up to date
git checkout develop
git fetch origin && git rebase origin/develop

# 2. Apply version bumps from changesets
pnpm changeset version

# 3. Rebuild catalog to validate
pnpm build:catalog

# 4. Commit
git add -A
git commit -m "chore: release"

# 5. Push develop — triggers dev-publish.yml (npm tag: dev)
git push origin develop

# 6. Open a PR: develop → main
gh pr create --title "chore: release" --base main --head develop \
  --body "Stable release — merge to trigger stable-publish.yml"

# 7. Once merged, stable-publish.yml publishes to npm (tag: latest)
```

## Recovery back-merge

If the back-merge workflow fails after a release (i.e. `main` is ahead of `develop`):

```bash
/back-merge marketplace
```

Or manually:

```bash
git checkout -b chore/back-merge-main-$(date +%Y%m%d)
git fetch origin
git merge origin/main --no-ff -m "chore: back-merge main → develop"
git push origin HEAD
gh pr create --title "chore: back-merge main → develop" --base develop --head HEAD \
  --body "Recovery back-merge after release."
```

## Verification post-release

After the stable workflow completes:

```bash
# Check a sample brick (replace `shell` with any changed brick)
npm view @focus-mcp/brick-shell version
npm view @focus-mcp/brick-shell dist-tags

# Verify git tag
git fetch --tags origin
git tag --sort=-version:refname | head -5

# Check GitHub Release was created
gh release list --repo focus-mcp/marketplace --limit 5
```

The catalog is auto-deployed (by `stable-publish` → `peaceiris/actions-gh-pages`) to:

```
https://focus-mcp.github.io/marketplace/catalog.json
```

## npm OIDC Trusted Publishing

No `NPM_TOKEN` secret is used. Publishing relies on npm OIDC Trusted Publishing (configured since July 2025). The workflows require `id-token: write` permission and a registered Trusted Publisher on npmjs.com.

See [../RELEASE_OIDC_SETUP.md](../RELEASE_OIDC_SETUP.md) for setup instructions if you need to configure a new package.
