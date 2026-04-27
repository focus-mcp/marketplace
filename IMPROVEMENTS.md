<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP Improvements Roadmap

> Tracks evolution opportunities identified through bench, R&D, and comparative analysis.
> Bugs are in [`benchmarks/PATCH_QUEUE.md`](./benchmarks/PATCH_QUEUE.md) — this file
> is for **enhancements** and architectural changes.

**Status legend** : 🚀 P0 in progress · 🔴 P0 · 🟡 P1 · 🔧 P2 · 📝 backlog

---

## 🔴 P0 — Highest ROI

### Cache global multi-brick (inspired by Poulpy)
**Problem**: Each brick maintains its own private cache. If agent calls sym → refs → cg sequentially on the same repo, code is parsed 3×.

**Solution**: Shared persistent index store at `~/.focusmcp/<project>/`:
- `cache.json` (metadata + gitHead for invalidation)
- `graph.json` (knowledge graph)
- `symbols.json` (compact inverted index)
- `parsed-cache.json` (per-file mtime + hash)

**Effort**: ~1.5 days
**Gain**: -50% to -90% on multi-brick sessions (real Phase 2b scenario)
**Source**: Patterns from Poulpy `~/.poulpy/<project>/` (private repo)

---

### Real tree-sitter multi-language (in progress, subagent active)
**Problem**: `bricks/treesitter` is regex-based, hardcoded TS/JS. Bricks downstream
(`callgraph`, `depgraph`, `symbol`, `refs`, `outline`) can't index PHP/Python/Go/Rust.

**Solution**: Real tree-sitter with dynamic grammar loading (TS, JS, PHP, Python, Go, Rust, Java).

**Effort**: 2-3 days (subagent in flight)
**Gain**: Multi-language unlocks 6 bricks for 5+ languages

---

## 🟡 P1 — Medium ROI

### Manifest compaction (top 10 verbose bricks)
**Problem**: Manifests up to 7,300 chars (~1,825 tokens) loaded every session.

**Top 10 to compact**: graphexport, lastversion, codeedit, parallel, diagram,
debate, textsearch, decision, convert, semanticsearch

**Solution**: Tighten descriptions (max 100 chars per tool), trim schemas, dedup brick-level vs tool-level descriptions.

**Effort**: 4h
**Gain**: -1,500 to -3,000 tokens per session

---

### Compact JSON keys in outputs (Poulpy pattern)
**Problem**: Outputs use verbose keys (`name`, `kind`, `file`, `line`).

**Solution**: Mono-char keys for index-heavy bricks: `{n: "Foo", k: "c", f: "x.ts", l: 42}`.

**Effort**: 1 day
**Gain**: -20% to -30% on outputs

---

### Output caps audit (some still verbose)
**Problem**: A few bricks still emit 400+ tokens where less would suffice (e.g., `outline.out_repo`).

**Solution**: Audit + apply `outputSizeUnder` thresholds + truncation strategies.

**Effort**: 1 day
**Gain**: Marginal, but tightens overall payload

---

### "Never wins" tools — manifest hint or deprecation
**Problem**: 11 tools have positive overhead (always cost more than native equivalent):
mr_batch, mr_merge, fl_glob, fl_list, fr_read/head/tail/range, fmt_json, fd_diff, refs_declaration.

**Solution options**:
- (A) Add `bench.usage: "batch"` hint in manifest, agent picks accordingly
- (B) Deprecate tools genuinely useless single-shot
- (C) Reduce envelope (output minimal)

**Effort**: 2h (A) → 1 day (B+C)
**Gain**: Agent avoids inefficient single-shot calls

---

### Search bricks consolidation / clarification
**Problem**: 4 search bricks with overlap (`textsearch`, `filesearch`, `fts`, `semanticsearch`) confuse the agent.

**Solution**:
- (A) Sharpen tool descriptions ("textsearch = simple regex; fts = pre-indexed corpus search; semanticsearch = TF-IDF; filesearch = file content + replace")
- (B) Or consolidate into 1 brick with modes

**Effort**: 0.5 day (A) → 2 days (B)
**Gain**: Agent picks right brick faster, fewer retries

---

### Read bricks consolidation
**Same pattern**: `fileread` + `multiread` + `smartread`. Clarify or consolidate.

---

### Git-aware invalidation (Poulpy pattern)
**Problem**: Bricks rebuild full index even when nothing changed.

**Solution**: Detect git changes (gitHead, dirty files) → re-parse only modified.

**Effort**: 1 day
**Gain**: Faster re-bench / re-index

---

## 🔧 P2 — Backlog

### Live graph visualization HTTP server (Poulpy pattern)
**Problem**: `graphexport` outputs static HTML. No live exploration.

**Solution**: New tool `start_graph_server` → http://localhost:3456 interactive.

**Effort**: 1-2 days
**Gain**: UX visualization

---

### Concept search cross-case (Poulpy pattern)
**Problem**: `fts_search` doesn't auto-search snake_case + camelCase + PascalCase variants of a concept.

**Solution**: New `fts_concept(name)` that expands variants.

**Effort**: 0.5 day
**Gain**: Powerful semantic search

---

### Vendor symbols separation
**Problem**: External deps mixed with project symbols.

**Solution**: Cache `vendor-symbols.json` distinct.

**Effort**: 0.5 day
**Gain**: Cleaner project-only views

---

### Framework-specific deep extractors (future bricks)
**Inspired by Poulpy Symfony deep parsers**:
- `php-symfony` brick (Doctrine, voters, messenger, dispatchers)
- `python-django` brick (models, views, ORM relations)
- `nextjs-deep` brick (routes, data fetching, server components)
- `prisma-deep` brick (schema, relations)

**Effort**: 3-5 days per framework
**Gain**: Major value for specific stacks
**Note**: Out of scope for FocusMCP generic core; could live as private/external bricks (`@samuelds/brick-php-symfony`).

---

### Bench infrastructure improvements

#### Phase 2b — Scenario bench (true agent measurement)
**Problem**: iso-task measures payload economy, not real multi-task agent dynamics.

**Solution**: Multi-task session bench (5-10 enchaînées sur même repo).

**Effort**: 2-3 days
**Gain**: True KPI for agent ROI

#### Promptfoo regression CI
**Solution**: Promptfoo config for reproducible runs in CI on each PR.

**Effort**: 3h setup + integration

#### Multi-sample averaging
**Solution**: 3-5 runs per brick + median (reduces variance).

**Effort**: 3h harness extension + 3-5× compute cost

#### Cross-model validation
**Solution**: Run bench with Claude / GPT / Gemini.

**Effort**: ~10h (multi-SDK provider abstraction)
**Gain**: Proves model-agnostic claim

#### Extend static equivalence to 100% measurable
**Currently**: 79/243 tools (32.5%, but 100% of measurable subset). 174 tools structurally non-measurable without LLM/state.

**Solution**: Add multi-input fixtures for variance per tool (3-5 inputs/tool, median).

**Effort**: 4h
**Gain**: Confidence intervals, statistical robustness

---

## 📝 Backlog (low priority / methodology)

### Stateful bricks mismeasured by single-task bench
- cache, memory, session, share, knowledge — value emerges in multi-task. Need scenario bench.

### Meta bricks under-measured
- planning, thinking, debate, decision, agent, dispatch, autopilot — orchestration value not captured iso-task.

### Bench-prompt: coverage-inducing task design
- Current prompt designed by Claude itself; consider explicit task specs.

### CLI / UX improvements (separate from bricks)
- No auto-install of brick dependencies (real user friction)
- Missing `focus upgrade` / `focus upgrade-all` command
- `center.lock` schema incomplete (CLI 1.x.0)
- `filelist.fl_glob` doesn't support `**` recursive globs

### Rename `treesitter` brick (currently regex-based)
- Honest naming once real tree-sitter v2 lands.

---

## 🔁 Source attributions

Improvements identified through:
- **Static equivalence bench** (`benchmarks/equivalence-report.md`) — coverage, never-wins
- **Math model** (`benchmarks/equivalence-math-report.md`) — break-even, projections
- **Comparative analysis** with Poulpy (private repo, fullstack Symfony) — cache, graph, compact keys
- **Multi-tools eval** — Promptfoo as bench framework choice
- **R&D session 2026-04-26/27** — tree-sitter false flag, SDK isolation

---

## How to use this file

1. New improvement idea → add at correct priority level with effort + gain.
2. Started work → mark with 🚀 + link to PR/branch.
3. Done → move to a `# Done` section at bottom or archive.
4. Reviewed quarterly to re-prioritize.
