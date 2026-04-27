# @focusmcp/compress

Compress text output to save tokens — strip comments, collapse whitespace, remove blank lines, and abbreviate common patterns.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Savings |
|---|---:|---:|---:|
| `cmp_terse` | 8,522 tokens | 233 tokens | **-97.2%** |
| `cmp_output` | 8,522 tokens | 6,605 tokens | **-19.9%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `output` | `cmp_output` | Strip comments, collapse whitespace, remove blank lines (light/medium/aggressive) |
| `response` | `cmp_response` | Compress JSON responses: strip nulls, shorten paths |
| `terse` | `cmp_terse` | Ultra-compressed: keep only identifier names |
