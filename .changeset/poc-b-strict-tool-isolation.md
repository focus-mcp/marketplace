---
---

chore(bench): strict tool isolation in brick mode (no more Read leakage)

Mode brick previously exposed `Read` natif alongside the brick's tools, which
made the agent compensate for unclear brick outputs by reading files directly.
This inflated tokens (+turns) and hid real brick design defects.

Now `allowedTools` in brick mode contains ONLY `mcp__focus__<prefix>_<tool>`.
This will reveal:
- Bricks whose outputs are incomprehensible without filesystem inspection
- Bricks missing feedback fields (path, content snippets, etc.)
- Real measurement of brick value (not mixed with native fallbacks)

Phase 2a / pre-fix sweeps are no longer comparable to post-fix sweeps. A new
baseline sweep is needed.
