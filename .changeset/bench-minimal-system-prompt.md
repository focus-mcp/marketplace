---
---

chore(bench/runner): minimal system prompt + FOCUS_BENCH_MODE env in brick mode

Removes claude_code preset pollution (Agent, Monitor, Skill, WebFetch, mcp__fileread__*, mcp__shell__*) and meta tools (focus_*). Brick mode now measures only the brick's own tools, as intended.
