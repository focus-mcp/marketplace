# @focus-mcp/brick-parallel

## 1.3.0

### Minor Changes

- bcca54d: feat(parallel): add par_run_inline tool — runs + collects in single round-trip

  Closes the run→collect 2-roundtrip pattern issue from PATCH_QUEUE P2.

  - New `par_run_inline({tasks})` returns `{runId, results, summary}` directly
  - Existing `par_run` + `par_collect` remain unchanged (no breaking)
  - Same caps applied (UTF-8 byte-safe stdout/stderr at 4KB)

### Patch Changes

- 0588b4a: fix(parallel): cap stdout/stderr per task at 4KB + evict oldest runs above 100 entries

  Resolves +79% token regression caught by Wave 4.3 integration tests:
  the `runs` Map stored full stdout/stderr per task without size cap, leading to payload bloat.
  Now `truncateOutput()` caps each stream at 4KB with explicit truncation marker, and the Map
  evicts the oldest entry when exceeding 100 runs (FIFO).

- 69bd0b4: chore(bench): per-brick maxTurns hint + auto-retry on max_turns escalation

  - bricks/parallel and bricks/sandbox declare bench.maxTurns: 40 in manifest
  - harness sweep reads the hint and uses max(global, manifest)
  - runBrickWithRetry escalates to maxTurns × 2 on first max_turns failure

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
