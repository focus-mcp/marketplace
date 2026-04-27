# @focusmcp/filelist

List directory contents for FocusMCP — entries, tree, glob, find.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Δ% |
|---|---:|---:|---:|
| `fl_glob` | 5,645 tokens | 5,713 tokens | **+1.2%** |
| `fl_list` | 90 tokens | 108 tokens | **+20.0%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `list` | `fl_list` | List directory entries |
| `tree` | `fl_tree` | Recursive directory tree |
| `glob` | `fl_glob` | Find files by glob pattern |
| `find` | `fl_find` | Find files by name |
