# @focus-mcp/contextpack

Pack files into compressed context bundles — reduce token usage by extracting only signatures, maps, or full content.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `pack` | `cp_pack` | Pack multiple files into a single context string |
| `budget` | `cp_budget` | Pack as many files as fit within a token budget |
| `estimate` | `cp_estimate` | Estimate pack size without packing |
| `prioritize` | `cp_prioritize` | Sort files by relevance to a query |
