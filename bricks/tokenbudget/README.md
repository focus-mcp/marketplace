# @focus-mcp/tokenbudget

Token budget management — estimate and optimize token usage for AI agents.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `estimate` | `tb_estimate` | Estimate token count for text or file (chars/4 heuristic) |
| `analyze` | `tb_analyze` | Analyze token cost of a directory, per-file breakdown |
| `fill` | `tb_fill` | Select files that fit in a budget using compression modes |
| `optimize` | `tb_optimize` | Suggest read modes for files within a budget |
