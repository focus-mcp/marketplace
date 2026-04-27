# @focusmcp/overview

Project-level understanding without reading all files — detect framework, language, conventions, and architecture at a glance.

## Measured economy

Static benchmark — no LLM, no variance, reproducible:

| Tool | Native equivalent | Brick output | Savings |
|---|---:|---:|---:|
| `ovw_project` | 2,415 tokens | 716 tokens | **-66.7%** |
| `ovw_dependencies` | 2,415 tokens | 1,182 tokens | **-45.1%** |

Conditions: payload-only measurement (iso-call). Multi-turn agent dynamics not modeled. See [global benchmark](../../benchmarks/equivalence-report.md) for methodology and full per-tool table.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `project` | `ovw_project` | Detect name, framework, language, type, scripts, packageManager |
| `architecture` | `ovw_architecture` | Scan directory structure, detect patterns (MVC, monorepo, src-layout) |
| `conventions` | `ovw_conventions` | Detect indent, quotes, semicolons, import style, line endings |
| `dependencies` | `ovw_dependencies` | Categorize deps and detect framework, testRunner, linter, bundler |
