<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Contributing to the FocusMCP marketplace

Thanks for your interest in the FocusMCP marketplace. This document describes **how to propose a brick** and the quality rules we enforce.

## Code of Conduct

All contributors agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Submission process

1. **Open an issue** via the "Brick submission" template (atomicity, domain, license).
2. Wait for maintainer validation — the goal is to avoid duplicates and kitchen-sink bricks.
3. **Open a PR** targeting the `develop` branch:
   - either by adding `bricks/<name>/` (brick hosted in this repo),
   - or by adding an entry to `external_bricks.json` (brick hosted elsewhere, with `source.type = "url"` or `"git-subdir"`).
4. The PR must pass **the whole CI**: lint, typecheck, tests, REUSE, gitleaks, catalog build.

## Local brick layout

```
bricks/<name>/
  mcp-brick.json        — manifest (required)
  package.json          — `name: "@focusmcp/<name>"`, `version`, `private: true`, `type: "module"`
  src/
    index.ts
    ...
  tests/ (or *.test.ts next to sources)
  README.md             — brick documentation
  LICENSE               — MIT (or an MIT-compatible license)
```

### `mcp-brick.json` manifest

Required fields:

- `name` (kebab-case, bare domain name — e.g. `echo`, `indexer`, `memory`)
- `description`
- `dependencies` (array of required brick names, may be empty)
- `tools` (array of `{name, description, inputSchema}`)

Optional fields: `tags`, `license`, `homepage`, `publisher`.

`version` **does not** appear in the manifest: it is read from `package.json` to keep Changesets as the single source of truth.

## Non-negotiable rules

1. **Atomicity** — 1 brick = 1 domain. No kitchen-sink bricks. If two responsibilities coexist, split into two bricks.
2. **Naming** — kebab-case, bare domain name (e.g. `echo`, `indexer`, `sf-router`). No `focus-` prefix. The npm package uses the scope `@focusmcp/<name>`.
3. **MIT-compatible license** — GPL/AGPL rejected to preserve the project license.
4. **TDD / Coverage ≥ 80 %** — tests required, coverage enforced in CI.
5. **SPDX headers** in every source file (`SPDX-FileCopyrightText: 2026 FocusMCP contributors` + `SPDX-License-Identifier: MIT`). For JSON files, create a sibling `.license` file (REUSE convention).
6. **Strict TypeScript** — no `any`, no `console.log` (use the core logger instead), ESM only.
7. **Conventional Commits** — enforced by commitlint (`feat(indexer): ...`, `fix(memory): ...`).
8. **Changeset required** on every PR that touches a brick (`pnpm changeset`). Mode is `independent`: each brick has its own version.

## Quality gates

Before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build:catalog     # validates the catalog structure against the JSON Schema
pnpm reuse             # REUSE compliance (SPDX headers)
```

## Review

Maintainers check:

- domain relevance (atomicity, no duplicate);
- code quality (tests, typing, lint);
- manifest conformance to the JSON Schema;
- coherence of the generated catalog.

## Security

Vulnerabilities must be reported **privately** — see [SECURITY.md](./SECURITY.md).
