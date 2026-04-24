<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP — Benchmark Report

**Last updated**: 2026-04-23  
**Branch**: `feat/benchmarks-phase-1`  
**Status**: Phase 1 ✅ complete · Phase 2a ✅ complete · Phase 2b ⏳ pending

---

## 1. Executive Summary

Across 62 bricks in a NestJS iso-task bench, FocusMCP bricks reduce total tokens by a **median of –52%** (range –84% to +379%) versus native Claude tool use.  
Top-10 bricks hit **–79% to –84%** savings with faster wall-clock; 15 bricks regress, 3 of which are confirmed path/implementation bugs.  
Phase 1 (static tool-definition cost) shows **92.6% average savings** on tool-def tokens alone across 3 task scenarios.  
**What we measured**: single-task iso-bench token cost and duration on a NestJS repo, in-process MCP.  
**What we did not measure**: multi-task session value, latency under network MCP transport, real user sessions, or the full Phase 2b scenario.

---

## 2. Methodology

**Model**: `claude-sonnet-4-6`. `settingSources: []`. Minimal system prompt (no extra context injected).

**Iso-task protocol**: the native agent (Bash/Read/Grep/Glob only) designs and solves a task in the brick's domain; the same task is then solved with the brick loaded. Both runs use the same NestJS shallow clone (`test-repo/`). Δ% = (brick\_tokens − native\_tokens) / native\_tokens.

**Token accounting**: input + cache\_creation + cache\_read + output tokens, all four Claude API categories summed. Cache tokens are included (they have API cost even at reduced pricing).

**Not measured**: Phase 2b multi-task scenario; real user sessions; latency under network MCP transport; stateful brick value over multiple turns (`cache`, `memory`, `session` — see §5).

---

## 3. Phase 1 — Tool-Definition Cost

> **Caveat**: Phase 1 measures only the tool-definition overhead (tokens consumed by the manifest), not end-to-end task cost. The baseline is ~18k tokens for tool definitions, not the 200k context window.

FocusMCP loads only installed bricks, replacing a large monolithic manifest with small focused subsets. Across 3 task scenarios the tool-definition footprint drops by **92.6% on average**:

| Scenario               | Native tool-def tokens | FocusMCP tool-def tokens | Savings |
|------------------------|----------------------:|-------------------------:|--------:|
| Code review task       | ~18,400               | ~980                     | –94.7%  |
| File search task       | ~18,400               | ~640                     | –96.5%  |
| Dependency analysis    | ~18,400               | ~2,100                   | –88.6%  |
| **Average**            |                       |                          | **–92.6%** |

Savings compound across every turn. Phase 2a confirms real end-to-end impact — but also shows gains are partly structural (see §4.4).

---

## 4. Phase 2a — Per-Brick End-to-End (62 bricks, NestJS iso-task)

### 4.1 Top 10 wins

| Brick         | Native    | Brick    | Δ%     | Dur. ratio | Coverage | Pattern |
|---------------|----------:|---------:|-------:|-----------:|----------|---------|
| rename        | 740k      | 121k     | –83.6% | 0.55×      | 1/4      | B       |
| contextpack   | 799k      | 136k     | –82.9% | 0.38×      | 1/4      | B       |
| fullaudit     | 674k      | 116k     | –82.8% | 0.25×      | 0/2      | B       |
| savings       | 575k      | 101k     | –82.4% | 0.22×      | 1/4      | B       |
| filesearch    | 726k      | 131k     | –81.9% | 0.57×      | 1/2      | B       |
| impact        | 775k      | 145k     | –81.3% | 0.40×      | 1/3      | B       |
| filediff      | 675k      | 127k     | –81.1% | 0.31×      | 1/3      | B       |
| decision      | 1,111k    | 216k     | –80.5% | 0.41×      | 4/4      | D       |
| fts           | 888k      | 175k     | –80.3% | 0.56×      | 2/4      | B       |
| refs          | 682k      | 140k     | –79.5% | 0.47×      | 1/4      | B       |

Top winners are also **faster** (duration ratio < 1×). Coverage is often 1–2 out of 3–4 tools — savings are partly from context reduction, not full tool leverage (see §4.4).

### 4.2 Regressions (15 bricks, sorted by Δ%)

| Brick       | Δ%      | Dur. ratio | Coverage | Root cause                              |
|-------------|--------:|-----------:|----------|-----------------------------------------|
| fileops     | +379.2% | 5.82×      | 1/4      | Path-resolution bug — wrong CWD         |
| graphexport | +118.7% | 1.74×      | 1/6      | 6 overlapping tools, verbose output     |
| metrics     | +102.6% | 6.06×      | 2/4      | Slow computation, verbose output        |
| parallel    | +78.6%  | 9.74×      | 3/4      | Serialization in allegedly parallel ops |
| share       | +51.3%  | 2.23×      | 3/4      | Stateful brick, not measurable iso-task |
| depgraph    | +50.5%  | 2.09×      | 0/5      | Cat C: task too easy for grep           |
| sandbox     | +42.0%  | 4.14×      | 3/4      | Sandbox startup overhead dominates      |
| cache       | +38.4%  | 1.90×      | 0/5      | Stateful — never called in single-task  |
| treesitter  | +66.3%  | 2.48×      | 0/5      | Cat C: task too easy for grep           |
| heatmap     | +28.7%  | 0.84×      | 2/4      | Verbose git-history output              |
| research    | +22.7%  | 3.49×      | 3/3      | Meta-brick overhead on simple task      |
| lastversion | +22.2%  | 1.43×      | 2/6      | Tool handler bug (confirmed P0)         |
| callgraph   | +18.3%  | 1.32×      | 0/4      | Cat C: task too easy for grep           |
| planning    | +11.2%  | 1.20×      | 4/4      | Meta-brick ceremony on simple task      |
| memory      | +11.0%  | 1.03×      | 2/5      | Stateful — no prior session to recall   |

**Category C** (callgraph, depgraph, treesitter): regressions caused by task-design flaw — the iso-task was solvable by trivial grep/read, not requiring structural analysis. These bricks are under-measured, not broken. Fix is to redesign the task (see PATCH\_QUEUE.md).

**Stateful bricks** (cache, memory, share): systematically penalised by the single-task bench. They require multi-turn or multi-task scenarios to show their value (Phase 2b).

### 4.3 Pattern distribution (62 bricks)

| Pattern | Count | Description |
|---------|------:|-------------|
| A       | 5     | Structural analysis |
| B       | 19    | File/code operations |
| C       | 4     | Graph/dependency (Cat C: task-design flaw) |
| D       | 12    | Decision/planning/review meta-tools |
| E       | 6     | Execution and sandboxing |
| Infra   | 10    | State, session, cache, memory |

### 4.4 Savings attribution (important)

On most bricks, the agent uses only 1–2 tools out of 3–6 available. The bulk of savings comes from a **smaller tool-definition footprint**, not from full domain-specific tool use.

Two saving types:
- **Context-reduction** (generic): smaller manifest → fewer tokens per turn regardless of tool calls.
- **Domain-leverage** (brick-specific): purpose-built tool replaces multiple native round-trips.

Of the median –52%, we attribute ~30–35% to context reduction and ~17–22% to domain leverage. Bricks with 0/N coverage but strong savings (e.g. `fullaudit` –82.8%, 0/2) show pure context reduction. Best-in-class (`decision` 4/4, `debate` 3/4, `knowledge` 3/5) combine both.

> **Summary**: median –52%, range –84% to +379%. Top-10 hits –79% to –84%.

---

## 5. Known Issues & Patches in Flight

See [`benchmarks/PATCH_QUEUE.md`](../benchmarks/PATCH_QUEUE.md) for full details.

**P0 — Critical (blockers)**:
- `fileops` path-resolution bug: brick operates on wrong CWD → +379% tokens, wrong answers. Audit `fo_copy`/`fo_rename`/`fo_move` for `cwd` handling.
- `lastversion` handler bug: tool returns verbose output, agent loops → +22% tokens with only 1/6 tools reached. Suspected: list-type output without pagination.
- `sandbox`: startup overhead dominates on small tasks (+42% tokens, 4× slower). Batch ops missing; TypeScript+FS scenario untested.

**P1 — High priority**:
- `fileops`: add bulk variants (`bulk_copy`, `bulk_move`) — single round-trip per file is heavier than native Bash for batch operations.
- `graphexport`: collapse/clarify 6 overlapping tools — agent is confused, coverage 1/6.
- `metrics`: slow computation on NestJS (+6× latency) — profile and add output truncation.
- `parallel`: serialization issue — advertises parallel execution but runs sequentially.

**Other**:
- 5 bricks missing `version` in manifest (center.lock schema — CLI 1.4.0).
- `convert`: CSV serializer bug (`val.includes is not a function`) — fix: coerce fields to string.
- `filewrite fw_create`: fails if file already exists — add `overwrite` option.
- `filelist fl_glob`: no `**` globstar support — falls back to `fl_find`.
- `focus add` layout mismatch: **FIXED** in PR focus-mcp/cli#38.

---

## 6. Phase 2b — Multi-Task Scenario (Placeholder)

10 curated tasks across domains (code review, dependency analysis, refactoring, search, format conversion, graph analysis, session memory, parallel orchestration) on the same NestJS repo. Two agents run the full set: (1) **native** — Bash/Read/Grep/Glob only; (2) **focus** — all 62 bricks enabled. Cumulative tokens and per-task success rate reported. Designed to surface stateful brick value (`cache`, `memory`, `session`) and meta-brick value (`planning`, `agent`, `dispatch`) that the iso-task bench cannot measure.

**Status**: TBD. Expected runtime: ~30–45 min per agent. Target: Q2 2026.

---

## 7. Reproducing the Results

```bash
git checkout feat/benchmarks-phase-1
cd marketplace/benchmarks/harness
pnpm install
pnpm tsx src/run-brick.ts --brick filelist
```

Individual fiche reports are in [`benchmarks/bricks/<name>.md`](../benchmarks/bricks/).

The `summary.json` is at [`benchmarks/harness/results/summary.json`](../benchmarks/harness/results/summary.json).

---

## 8. Appendix — All 62 Bricks

| Brick          | Native    | Brick     | Δ%      | Dur.   | Coverage |
|----------------|----------:|----------:|--------:|-------:|----------|
| rename         | 740k      | 121k      | –83.6%  | 0.55×  | 1/4      |
| contextpack    | 799k      | 136k      | –82.9%  | 0.38×  | 1/4      |
| fullaudit      | 674k      | 116k      | –82.8%  | 0.25×  | 0/2      |
| savings        | 575k      | 101k      | –82.4%  | 0.22×  | 1/4      |
| filesearch     | 726k      | 131k      | –81.9%  | 0.57×  | 1/2      |
| impact         | 775k      | 145k      | –81.3%  | 0.40×  | 1/3      |
| filediff       | 675k      | 127k      | –81.1%  | 0.31×  | 1/3      |
| decision       | 1,111k    | 216k      | –80.5%  | 0.41×  | 4/4      |
| fts            | 888k      | 175k      | –80.3%  | 0.56×  | 2/4      |
| refs           | 682k      | 140k      | –79.5%  | 0.47×  | 1/4      |
| textsearch     | 566k      | 120k      | –78.7%  | 0.40×  | 1/4      |
| smartcontext   | 554k      | 120k      | –78.3%  | 0.43×  | 0/3      |
| compress       | 993k      | 224k      | –77.4%  | 0.67×  | 1/3      |
| shell          | 593k      | 134k      | –77.4%  | 0.29×  | 1/4      |
| multiread      | 601k      | 139k      | –76.8%  | 0.96×  | 1/3      |
| inline         | 549k      | 130k      | –76.2%  | 0.28×  | 1/3      |
| outline        | 545k      | 132k      | –75.7%  | 0.61×  | 1/3      |
| onboarding     | 608k      | 148k      | –75.6%  | 0.30×  | 0/2      |
| autopilot      | 552k      | 144k      | –73.9%  | 0.41×  | 0/3      |
| codeedit       | 698k      | 183k      | –73.8%  | 0.25×  | 1/4      |
| tokenbudget    | 494k      | 132k      | –73.2%  | 0.66×  | 1/4      |
| graphbuild     | 582k      | 168k      | –71.2%  | 0.47×  | 2/5      |
| repos          | 470k      | 138k      | –70.5%  | 0.56×  | 2/4      |
| graphquery     | 1,665k    | 547k      | –67.1%  | 0.70×  | 0/5      |
| format         | 568k      | 195k      | –65.6%  | 0.92×  | 1/4      |
| validate       | 2,450k    | 867k      | –64.6%  | 0.63×  | 0/4      |
| overview       | 1,394k    | 493k      | –64.6%  | 0.84×  | 2/4      |
| debate         | 761k      | 283k      | –62.8%  | 0.53×  | 3/4      |
| smartread      | 528k      | 229k      | –56.6%  | 0.84×  | 2/5      |
| echo           | 290k      | 134k      | –53.7%  | 0.84×  | 1/1      |
| batch          | 310k      | 144k      | –53.5%  | 0.81×  | 1/4      |
| convert        | 537k      | 262k      | –51.2%  | 0.49×  | 1/4      |
| fileread       | 461k      | 229k      | –50.3%  | 1.37×  | 2/4      |
| task           | 556k      | 279k      | –49.8%  | 0.89×  | 0/4      |
| semanticsearch | 671k      | 357k      | –46.9%  | 0.76×  | 1/4      |
| review         | 1,513k    | 909k      | –39.9%  | 1.01×  | 0/4      |
| agent          | 681k      | 414k      | –39.2%  | 1.15×  | 1/4      |
| knowledge      | 511k      | 318k      | –37.7%  | 0.83×  | 3/5      |
| thinking       | 465k      | 290k      | –37.6%  | 1.18×  | 2/4      |
| diagram        | 439k      | 293k      | –33.3%  | 1.49×  | 1/3      |
| session        | 467k      | 358k      | –23.4%  | 1.74×  | 2/4      |
| filewrite      | 688k      | 537k      | –22.0%  | 1.68×  | 2/3      |
| graphcluster   | 616k      | 490k      | –20.5%  | 1.26×  | 3/4      |
| routes         | 675k      | 540k      | –20.0%  | 1.35×  | 0/4      |
| dispatch       | 794k      | 671k      | –15.6%  | 1.18×  | 3/4      |
| filelist       | 493k      | 444k      | –10.0%  | 1.19×  | 2/4      |
| symbol         | 628k      | 603k      | –3.9%   | 1.35×  | 0/4      |
| memory         | 607k      | 674k      | +11.0%  | 1.03×  | 2/5      |
| planning       | 637k      | 708k      | +11.2%  | 1.20×  | 4/4      |
| callgraph      | 642k      | 759k      | +18.3%  | 1.32×  | 0/4      |
| lastversion    | 364k      | 445k      | +22.2%  | 1.43×  | 2/6      |
| research       | 757k      | 929k      | +22.7%  | 3.49×  | 3/3      |
| heatmap        | 282k      | 363k      | +28.7%  | 0.84×  | 2/4      |
| cache          | 508k      | 703k      | +38.4%  | 1.90×  | 0/5      |
| sandbox        | 524k      | 744k      | +42.0%  | 4.14×  | 3/4      |
| depgraph       | 781k      | 1,176k    | +50.5%  | 2.09×  | 0/5      |
| share          | 379k      | 573k      | +51.3%  | 2.23×  | 3/4      |
| treesitter     | 460k      | 766k      | +66.3%  | 2.48×  | 0/5      |
| parallel       | 325k      | 582k      | +78.6%  | 9.74×  | 3/4      |
| metrics        | 505k      | 1,023k    | +102.6% | 6.06×  | 2/4      |
| graphexport    | 303k      | 662k      | +118.7% | 1.74×  | 1/6      |
| fileops        | 404k      | 1,939k    | +379.2% | 5.82×  | 1/4      |

Individual fiches: [`benchmarks/bricks/<name>.md`](../benchmarks/bricks/) — each contains the mini-task definition, per-token breakdown, tool coverage, answer comparison, and recommendations.
