# @focusmcp/filediff

File comparison tools for FocusMCP — diff, patch, delta.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Δ% |
|---|---:|---:|---:|
| `fd_diff` | 1,161 tokens | 1,155 tokens | **-0.5%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `diff` | `fd_diff` | Compare two files and return unified diff |
| `patch` | `fd_patch` | Apply a unified diff patch to a file |
| `delta` | `fd_delta` | Show only changed lines between two strings (compact) |
