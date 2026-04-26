---
"@focus-mcp/brick-parallel": patch
"@focus-mcp/brick-sandbox": patch
---

chore(bench): per-brick maxTurns hint + auto-retry on max_turns escalation

- bricks/parallel and bricks/sandbox declare bench.maxTurns: 40 in manifest
- harness sweep reads the hint and uses max(global, manifest)
- runBrickWithRetry escalates to maxTurns × 2 on first max_turns failure
