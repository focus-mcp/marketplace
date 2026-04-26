---
"@focus-mcp/brick-parallel": patch
---

fix(parallel): cap stdout/stderr per task at 4KB + evict oldest runs above 100 entries

Resolves +79% token regression caught by Wave 4.3 integration tests:
the `runs` Map stored full stdout/stderr per task without size cap, leading to payload bloat.
Now `truncateOutput()` caps each stream at 4KB with explicit truncation marker, and the Map
evicts the oldest entry when exceeding 100 runs (FIFO).
