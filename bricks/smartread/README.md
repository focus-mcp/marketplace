# @focusmcp/smartread

Intelligent file reading for FocusMCP — multiple modes to minimize token usage.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `full` | `sr_full` | Read entire file (fallback mode) |
| `map` | `sr_map` | File structure only — signatures, no bodies |
| `signatures` | `sr_signatures` | Exported function/class signatures only |
| `imports` | `sr_imports` | Import/require statements only |
| `summary` | `sr_summary` | One-line summary per function/block |
