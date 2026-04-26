---
"@focus-mcp/brick-memory": patch
---

fix(memory): cap mem_list to 100 entries by default (override via limit param)

Bounds the worst-case payload for users with many memory entries.
Adds total count to reflect truncation.
