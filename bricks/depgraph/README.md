# @focusmcp/depgraph

Dependency graph analysis for FocusMCP — imports, exports, circular dependency detection, fan-in/out.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `imports` | `dep_imports` | List all imports of a file |
| `exports` | `dep_exports` | List all exports of a file |
| `circular` | `dep_circular` | Detect circular dependencies in a directory |
| `fanin` | `dep_fanin` | Find which files import this file |
| `fanout` | `dep_fanout` | Count how many files this file imports |
