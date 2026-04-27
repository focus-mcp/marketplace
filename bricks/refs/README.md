# @focusmcp/refs

Cross-references — find who imports or uses a symbol, locate declarations, and trace inheritance chains.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Savings |
|---|---:|---:|---:|
| `refs_hierarchy` | 2,678 tokens | 7 tokens | **-99.7%** |
| `refs_references` | 12,930 tokens | 2,261 tokens | **-82.0%** |
| `refs_declaration` | 63 tokens | 40 tokens | **-35.5%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `references` | `refs_references` | Find all files that import or reference a symbol |
| `implementations` | `refs_implementations` | Find implementations of an interface or type |
| `declaration` | `refs_declaration` | Find where a symbol is declared or exported |
| `hierarchy` | `refs_hierarchy` | Class or interface inheritance chain |
