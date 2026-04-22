# @focus-mcp/callgraph

Call graph analysis for FocusMCP — find callers, callees, call chains, and call depth.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `callers` | `cg_callers` | Find functions that call this function |
| `callees` | `cg_callees` | Find functions this function calls |
| `chain` | `cg_chain` | Find the call chain from A to Z |
| `depth` | `cg_depth` | Find the maximum call depth |
