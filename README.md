<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP Marketplace

> Official catalog of 68+ bricks for [FocusMCP](https://github.com/focus-mcp/cli).

![Built with Claude Code](https://img.shields.io/badge/built_with-Claude_Code-8A2BE2)

## What's a brick?

A brick is an atomic MCP module with a well-defined scope.
Examples: `shell` runs commands, `echo` replies messages, `lastversion` checks package versions.

Users compose bricks on demand — only the ones they need load into their AI's context.

## Browse bricks

Use the FocusMCP CLI:

```bash
npm install -g @focus-mcp/cli
focus browse
```

Or view the raw catalog:

```bash
curl https://focus-mcp.github.io/marketplace/catalog.json
```

## Categories

- **Files**: fileread, filewrite, filelist, fileops, filesearch, filediff, smartread, multiread
- **Code Intelligence**: treesitter, symbol, callgraph, depgraph, cache, outline, refs
- **Context**: smartcontext, overview, compress, tokenbudget, contextpack
- **Shell & Execution**: shell, sandbox, batch
- **Code Editing**: rename, codeedit, inline
- **Reasoning**: thinking, planning, decision
- **Search**: textsearch, fts, semanticsearch
- **Knowledge**: knowledge, graphbuild, graphquery, graphcluster, graphexport
- **Orchestration**: dispatch, parallel, debate, review, research, agent, share, task
- **Analytics**: metrics, heatmap, savings
- **Utilities**: format, validate, convert, diagram, routes
- **Workflows**: onboarding, fullaudit, autopilot
- **Version intelligence**: lastversion

(This list is for humans — the full catalog is at `catalog.json`)

## Measured economy

Static, reproducible benchmark on 79 tools across all 69 bricks (no LLM, no variance):

| | Tokens |
|---|---:|
| Native equivalent (raw `Read`, `Grep`, etc.) | 366,912 |
| FocusMCP bricks output | 127,228 |
| **Saved** | **239,684 (−65.3%)** |

**Top 5 most efficient tools** (best replacement for native operations):

| Tool | Native | Brick | Δ |
|---|---:|---:|---:|
| `treesitter.ts_reindex` | 8,522 | 4 | **−100.0%** |
| `treesitter.ts_index` | 5,645 | 7 | **−99.9%** |
| `symbol.sym_find` | 2,678 | 4 | **−99.9%** |
| `routes.rt_list` | 6,796 | 10 | **−99.9%** |
| `symbol.sym_bulk` | 8,237 | 12 | **−99.9%** |

**Caveats** (full transparency):
- 4 tools show marginal overhead (+2 to +28%) on tiny outputs where JSON envelope weighs more than the operation. Examples: `fl_list`, `fr_head`, `fr_range`, `fmt_json`.
- This is iso-call measurement: it captures payload economy, not multi-turn agent dynamics. Real agent sessions have variance and exploration costs that this benchmark doesn't model.
- See [`benchmarks/equivalence-report.md`](./benchmarks/equivalence-report.md) for the full per-tool table and methodology.

Reproduce: `pnpm --filter @focusmcp/bench-harness exec tsx src/equivalence.ts`

## Break-even by tool category

Some bricks save tokens immediately, others need multiple calls to amortize their fixed cost
(manifest loaded once per session = fixed overhead M+D).

| Category | Tools | Break-even | Example |
|---|---|---|---|
| Always wins | outline, smartread, refs, compress, fts, textsearch, filesearch, overview, rename | N=1 | `outline.out_repo` saves 23,226 tokens/call |
| Wins fast (≤10 calls) | — | ≤ 10 | — |
| Wins eventually (≤100 calls) | — | ≤ 100 | — |
| Never wins (single-shot) | fileread, filelist, multiread, filediff, format | ∞ | JSON envelope > operation savings |

**Session projection** (50 varied calls, top-quartile mix): ~80% token savings vs native.

See [full math model report](./benchmarks/equivalence-math-report.md).

## Roadmap & improvements

Enhancement opportunities tracked in [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) — architecture, performance, and new capabilities.
Bugs and patches are in [`benchmarks/PATCH_QUEUE.md`](./benchmarks/PATCH_QUEUE.md).


## Contribute a brick

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## AI-assisted development

FocusMCP was built with heavy Claude Code assistance — its architecture, implementation,
docs, and tests have all been co-authored with AI. We embrace this openly because:

1. **Transparency matters** — we'd rather disclose it than pretend otherwise
2. **AI tooling is the context** — we're building tools for AI agents, it makes sense to use them
3. **Quality over origin** — what matters is that the code is tested, reviewed, and working

**Your AI-assisted contributions are welcome.** We don't require you to hide the fact that
Claude, Copilot, Cursor, or any other tool helped you. What we do expect:

- Tests pass, code is typed, lint is green
- You've read the diff and understand what the PR does
- Conventional Commits, clear PR description
- You can explain your design choices during review

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guidelines.

## License

[MIT](./LICENSE)
