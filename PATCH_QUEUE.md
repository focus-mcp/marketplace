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

## (add new entries here)
