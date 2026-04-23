# FocusMCP Benchmarks

Static token-cost benchmark validating the "200k → ~2k tokens" claim.

## What this benchmarks

Without FocusMCP, an AI agent loads **all** brick tool definitions at startup.
With FocusMCP, the agent loads only the bricks needed for the current task.

This benchmark measures that difference in **token cost** using the cl100k_base
BPE tokenizer (same as GPT-4/Claude) on each brick's `tools` array —
exactly what an MCP server sends in a `tools/list` response.

Phase 1 (this) = static math on tool definitions.
Phase 2 (roadmap) = real execution on 15 target repos.

## How to run

```bash
# From marketplace root
pnpm benchmark
```

This runs two steps:
1. `tsx benchmarks/src/measure.ts` — counts tokens per brick, computes savings per task
2. `tsx benchmarks/src/report.ts` — generates `BENCHMARKS.md` at marketplace root

## Output locations

| File | Description |
|---|---|
| `benchmarks/reports/summary.json` | Machine-readable full results |
| `benchmarks/reports/<task-id>.md` | Per-task breakdown |
| `BENCHMARKS.md` | Marketing-friendly report (root) |

## How to interpret the numbers

- **Baseline tokens**: cost of loading all 68 bricks (no FocusMCP)
- **Focus tokens**: cost of loading only the bricks needed for a task
- **Savings %**: (baseline - focus) / baseline × 100

A 95% savings means an agent pays ~5% of the usual token cost for that task.

## Task scenarios

See `tasks.json` for the 3 scenarios. Each lists the bricks an expert agent would load:

- `read-understand`: exploration — filelist, fileread, smartread, symbol, overview
- `search-usages`: search — filesearch, textsearch, symbol, refs, semanticsearch
- `edit-refactor`: editing — fileread, symbol, codeedit, validate

## Phase 2 roadmap

- Clone the 15 repos listed in `repos.json`
- Run each task scenario with and without FocusMCP
- Measure actual context window token usage (not just tool definitions)
- Store clones under `.cache/` (git-ignored)
