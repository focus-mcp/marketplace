<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Architecture — FocusMCP Marketplace

## Overview

Monorepo of 68+ atomic bricks + the tooling that assembles them into a browsable `catalog.json`.
Each brick is an independent npm package under `@focus-mcp/brick-<name>`.

```
focus-mcp/marketplace (this repo)
  │
  ├─ bricks/                  ← 68+ atomic MCP modules
  │   ├─ echo/               ← example: hello-world brick
  │   ├─ shell/              ← shell command execution
  │   ├─ filesystem/         ← composite: read+write+list+ops+search
  │   └─ …
  │
  ├─ modules/
  │   └─ manager/            ← SvelteKit dashboard (Phase 2, optional)
  │
  ├─ scripts/
  │   └─ build-catalog.ts    ← generates publish/catalog.json
  │
  ├─ schemas/
  │   └─ catalog/v1.json     ← JSON Schema, validates catalog output
  │
  └─ publish/catalog.json    ← served via raw.githubusercontent.com
```

## Brick anatomy

Each brick is a self-contained package:

```
bricks/<name>/
├── package.json             ← @focus-mcp/brick-<name>
├── mcp-brick.json           ← the MCP manifest (tools, tags, deps)
├── src/
│   ├── index.ts            ← Brick contract ({ manifest, start, stop })
│   ├── operations.ts       ← pure logic
│   └── index.test.ts       ← Vitest suite
├── README.md
└── SPDX *.license sidecars
```

Two brick types:
- **Atomic** — has its own tools (e.g. `shell`, `echo`)
- **Composite** — no own tools, loads dependency bricks (e.g. `filesystem`, `codebase`, `devtools`)

## Catalog generation

`scripts/build-catalog.ts` scans `bricks/*`, reads each `mcp-brick.json` + `package.json`, and
emits `publish/catalog.json` validated against `schemas/catalog/v1.json`.

Consumers (FocusMCP CLI, third-party tools) fetch this JSON to discover and resolve bricks.

## Publish pipeline

Two GitHub Actions workflows:

| Workflow | Trigger | Output |
|---|---|---|
| `dev-publish.yml` | push to `develop` | `@focus-mcp/brick-*@<version>-dev.<N>` on npmjs.org with `@dev` tag |
| `stable-publish.yml` | push to `main` | `@focus-mcp/brick-*@<version>` on npmjs.org with `@latest` tag |

Versions live in each brick's `package.json` — no Changesets, no lockstep bumping.

## Conventions

1. **Atomicity first** — 1 brick = 1 domain. No kitchen-sink bricks.
2. **Kebab-case, no prefix** — brick dirs are bare (`bricks/echo/`, not `focus-echo/`). The scope
   `@focus-mcp/brick-*` adds the distinction at publish time.
3. **REUSE/SPDX** — every file has a SPDX header or `.license` sidecar (for JSON).
4. **TDD** — tests alongside sources, ≥ 80% coverage.
5. **Manifests are source of truth** — `mcp-brick.json` describes tools and deps; the catalog
   is derived, never hand-edited.

## Adding a new brick

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the step-by-step.

## Third-party catalogs

FocusMCP supports multi-source catalogs. Users can add custom catalog URLs via
`focus catalog add <url> <name>`. The format is the same (`schemas/catalog/v1.json`).
