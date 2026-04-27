# @focusmcp/format

Format data into various output formats — pretty JSON, YAML, markdown, ASCII tables.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Savings |
|---|---:|---:|---:|
| `fmt_json` | 2,415 tokens | 2,421 tokens | **+12.4%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `json` | `fmt_json` | Format and pretty-print JSON with optional key sorting |
| `yaml` | `fmt_yaml` | Convert JSON data to YAML format |
| `markdown` | `fmt_markdown` | Convert structured JSON to markdown (list, table, or headings) |
| `table` | `fmt_table` | Format tabular data as an ASCII table with alignment |
