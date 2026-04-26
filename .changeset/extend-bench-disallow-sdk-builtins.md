---
---

chore(bench/runner): extend BRICK_DISALLOWED_TOOLS with Claude Agent SDK builtins

The SDK exposes Agent, Monitor, PushNotification, Skill, WebFetch, WebSearch, etc.
as builtin tools that bypass allowedTools whitelist. Adding them explicitly to
disallowedTools to enforce strict isolation in brick mode.
