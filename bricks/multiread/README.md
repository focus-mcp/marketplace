# @focusmcp/multiread

Batch file reading for FocusMCP — multiple files in one call, deduplication, merge.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Δ% |
|---|---:|---:|---:|
| `mr_merge` | 8,246 tokens | 8,268 tokens | **+0.3%** |
| `mr_batch` | 8,246 tokens | 8,331 tokens | **+1.0%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `batch` | `mr_batch` | Read multiple files in one call |
| `dedup` | `mr_dedup` | Read multiple files, deduplicate shared imports/headers |
| `merge` | `mr_merge` | Read and concatenate files with separators |
