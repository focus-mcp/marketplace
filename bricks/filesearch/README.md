# @focusmcp/filesearch

Search and replace in files for FocusMCP.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Savings |
|---|---:|---:|---:|
| `fsrch_search` | 5,560 tokens | 3,055 tokens | **-44.6%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `search` | `fsrch_search` | Regex search in files |
| `replace` | `fsrch_replace` | Search and replace in file |
