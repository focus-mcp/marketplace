---
"@focus-mcp/brick-parallel": minor
---

feat(parallel): add par_run_inline tool — runs + collects in single round-trip

Closes the run→collect 2-roundtrip pattern issue from PATCH_QUEUE P2.
- New `par_run_inline({tasks})` returns `{runId, results, summary}` directly
- Existing `par_run` + `par_collect` remain unchanged (no breaking)
- Same caps applied (UTF-8 byte-safe stdout/stderr at 4KB)
