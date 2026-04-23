<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Contributing to the FocusMCP marketplace

Thanks for your interest in the FocusMCP marketplace. This document describes **how to propose a brick** and the quality rules we enforce.

## AI-assisted contributions

FocusMCP was largely built with Claude Code. We encourage and welcome AI-assisted PRs.

**You don't need to hide it.** If Claude wrote the code, just say so in the PR description
(`Generated with Claude Code`, `Co-authored by GPT-4`, whatever's accurate). Bonus points
for including the prompt or the key instructions you used.

**What we care about, regardless of who wrote it:**

- ✅ Tests pass
- ✅ Types are strict (no `any`, no `@ts-ignore` without a comment)
- ✅ Lint is green (`pnpm lint`)
- ✅ Coverage ≥ 80% (100% on critical modules)
- ✅ Commit messages follow Conventional Commits
- ✅ PR has a clear description — "what, why, how to verify"
- ✅ You understand the diff and can discuss design during review

**What gets you rejected:**

- ❌ Obviously untested AI slop (generated code that doesn't run)
- ❌ PRs with no description, just "here's some code"
- ❌ Hidden AI use that makes review confusing

We don't care if you used AI, we care if the PR is good.

## Code of Conduct

All contributors agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Submission process

1. **Fork this repo** on GitHub.
2. **Create a new directory** in `bricks/<your-brick-name>/`.
3. **Add the required files** (see layout below).
4. **Follow the atomicity principle** — 1 brick = 1 domain, small and composable.
5. **Use Conventional Commits** for all your commit messages.
6. **Submit a PR to `develop`** with a description of the domain covered and justification of atomicity (why it is not covered by an existing brick).

The PR must pass **the whole CI**: lint, typecheck, tests, REUSE, gitleaks, catalog build.

## Local brick layout

```
bricks/<name>/
  mcp-brick.json        — manifest (required)
  package.json          — `name: "@focus-mcp/brick-<name>"`, `version`, `type: "module"`
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

`version` **does not** appear in the manifest: it is read from `package.json`.

## Non-negotiable rules

1. **Atomicity** — 1 brick = 1 domain. No kitchen-sink bricks. If two responsibilities coexist, split into two bricks.
2. **Naming** — kebab-case, bare domain name (e.g. `echo`, `indexer`, `sf-router`). No `focus-` prefix. The npm package uses the scope `@focus-mcp/brick-<name>`.
3. **MIT-compatible license** — GPL/AGPL rejected to preserve the project license.
4. **TDD / Coverage ≥ 80 %** — tests required, coverage enforced in CI.
5. **SPDX headers** in every source file (`SPDX-FileCopyrightText: 2026 FocusMCP contributors` + `SPDX-License-Identifier: MIT`). For JSON files, create a sibling `.license` file (REUSE convention).
6. **Strict TypeScript** — no `any`, no `console.log` (use the core logger instead), ESM only.
7. **Conventional Commits** — enforced by commitlint (`feat(indexer): ...`, `fix(memory): ...`).

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
