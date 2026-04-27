# @focusmcp/outline

File and repo structure outline — list exported symbols and directory trees without reading full content.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Savings |
|---|---:|---:|---:|
| `out_repo` | 23,712 tokens | 436 tokens | **-98.1%** |
| `out_file` | 8,522 tokens | 323 tokens | **-96.1%** |
| `out_structure` | 5,645 tokens | 956 tokens | **-82.9%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `file` | `out_file` | Outline a single file: exported symbols with line numbers |
| `repo` | `out_repo` | Outline entire repo: per-file symbol summary |
| `structure` | `out_structure` | Directory structure with file counts per folder |
