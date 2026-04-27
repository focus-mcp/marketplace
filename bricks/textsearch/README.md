# @focusmcp/textsearch

Text search and replace across files — regex search, multi-file replace, grouped results.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Savings |
|---|---:|---:|---:|
| `txt_grouped` | 5,560 tokens | 968 tokens | **-82.4%** |
| `txt_search` | 5,560 tokens | 2,613 tokens | **-52.6%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `search` | `txt_search` | Search for text pattern across files |
| `regex` | `txt_regex` | Search with JavaScript regex |
| `replace` | `txt_replace` | Search and replace (dry run by default) |
| `grouped` | `txt_grouped` | Search with results grouped by file |
