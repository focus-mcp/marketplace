# @focusmcp/share

Shared state for multi-agent — share context, files, results between agents, broadcast messages.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `context` | `shr_context` | Share or retrieve shared context (key-value store visible to all agents) |
| `files` | `shr_files` | Share file references between agents (register which agent owns or watches which files) |
| `results` | `shr_results` | Share task results — store and retrieve results by task ID |
| `broadcast` | `shr_broadcast` | Send a message to all registered listeners (in-memory pub/sub) |
