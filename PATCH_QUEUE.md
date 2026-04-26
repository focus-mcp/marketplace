# PATCH_QUEUE

Bugs or suspicious findings that need a fix but are NOT fixed here (out of scope for current wave).

## Wave 5.2 — graph bricks

### graphexport: +118% tokens in Phase 2a sweep — INVESTIGATED, NOT A SMOKING GUN

**Status:** Cleared. No output bloat found.

**Investigation (2026-04-25):**
Measured all ge_* output sizes for a 5-node / 4-edge graph:
- ge_html : 2020B (budget 8192)
- ge_mermaid : 185B (budget 4096)
- ge_graphml : 1389B (budget 4096)
- ge_cypher : 378B (budget 2048)
- ge_obsidian : 339B (budget 4096)
- ge_wiki : 674B (budget 4096)

All outputs are proportional to node count. The +118% tokens in Phase 2a was
likely due to larger ambient context at sweep time (graphexport src has 7 tools
with verbose schemas), not output bloat from the tool itself.

**Conclusion:** No smoking gun. outputSizeUnder guards added to all ge_* scenarios
to prevent future regressions.

---

## Wave 5.x — memory brick

### memory: +22% sweep delta — CLEARED (methodology issue + mem_list now bounded)

**Status:** CLEARED — methodology issue (single-task bench ≠ memory use case) + mem_list now bounded by default in 1.1.1.

**Investigation (2026-04-25):**
The +22% sweep delta was primarily a methodology issue: the memory brick benefits from
multiple sessions (repeated store/recall), which is not measured accurately by a
single-task benchmark. The delta reflected ambient context growth, not output bloat.

As a safety improvement, `mem_list` now caps to 100 entries by default to prevent
worst-case payloads on heavy users. A `limit` param allows override; `limit=0` is unlimited.
A `total` field in the response reflects the un-capped count.

**Conclusion:** Not a smoking gun. mem_list bounded as safety improvement. No further action needed.

---

## (add new entries here)
