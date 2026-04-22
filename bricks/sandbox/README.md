# @focusmcp/sandbox

Sandboxed code execution — run JavaScript snippets in an isolated Node.js VM context.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `run` | `box_run` | Execute a JavaScript snippet in a sandboxed VM context |
| `file` | `box_file` | Read a JS file and execute it in the sandbox |
| `eval` | `box_eval` | Evaluate a single JavaScript expression |
| `languages` | `box_languages` | List supported languages and their status |

## Security

- Uses Node.js `node:vm` module — no unsafe dynamic evaluation methods
- Isolated context: `process`, `require`, `__dirname`, `global` are **not** available
- Configurable execution timeout (default: 5000ms for `run`/`file`, 2000ms for `eval`)
- Errors are caught and returned gracefully — no exceptions propagate to the caller
