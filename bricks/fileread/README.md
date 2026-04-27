# @focusmcp/fileread

Read files for FocusMCP — full content, head, tail, line range.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Δ% |
|---|---:|---:|---:|
| `fr_tail` | 56 tokens | 51 tokens | **-8.9%** |
| `fr_read` | 8,522 tokens | 8,525 tokens | **+0.0%** |
| `fr_range` | 360 tokens | 375 tokens | **+4.2%** |
| `fr_head` | 54 tokens | 58 tokens | **+7.4%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `read` | `fr_read` | Read entire file content |
| `head` | `fr_head` | Read first N lines |
| `tail` | `fr_tail` | Read last N lines |
| `range` | `fr_range` | Read specific line range |
