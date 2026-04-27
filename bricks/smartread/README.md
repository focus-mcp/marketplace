# @focusmcp/smartread

Intelligent file reading for FocusMCP — multiple modes to minimize token usage.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Savings |
|---|---:|---:|---:|
| `sr_summary` | 8,522 tokens | 20 tokens | **-99.8%** |
| `sr_signatures` | 8,522 tokens | 44 tokens | **-99.5%** |
| `sr_imports` | 8,522 tokens | 198 tokens | **-97.6%** |
| `sr_map` | 8,522 tokens | 1,292 tokens | **-84.3%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `full` | `sr_full` | Read entire file (fallback mode) |
| `map` | `sr_map` | File structure only — signatures, no bodies |
| `signatures` | `sr_signatures` | Exported function/class signatures only |
| `imports` | `sr_imports` | Import/require statements only |
| `summary` | `sr_summary` | One-line summary per function/block |
