---
"@focus-mcp/brick-fileops": minor
---

fix(fileops): fail-fast guard when workRoot is not set + advertise setRoot in tool descriptions

Resolves the +379% token / 5.82× latency regression caught by Phase C3 integration tests:
the brick silently operated on the wrong directory when the MCP server was started from
a different cwd than the agent's workspace. The setRoot tool now MUST be called first,
or the first non-existent path triggers a descriptive error instead of silent failure.
