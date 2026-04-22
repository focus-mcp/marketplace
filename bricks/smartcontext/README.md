# @focus-mcp/smartcontext

Composite brick — orchestrates smartread, cache, compress, tokenbudget, and overview to deliver optimal context within a token budget.

## Dependencies

- `smartread` — file reading with multiple modes
- `cache` — in-memory file cache
- `compress` — text compression
- `tokenbudget` — token estimation and budget management
- `overview` — project-level understanding

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `load` | `sctx_load` | Auto-discover relevant files and assemble context within budget |
| `refresh` | `sctx_refresh` | Re-check files for changes and update context |
| `status` | `sctx_status` | Show current context budget usage and cache statistics |
