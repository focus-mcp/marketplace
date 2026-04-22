# @focus-mcp/inline

Inline, extract, and move refactoring — inline variables/functions, extract code to new functions, move between files.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `inline` | `inl_inline` | Inline a variable or simple function — replace all usages with the definition |
| `extract` | `inl_extract` | Extract lines into a new named function, replacing originals with a call |
| `move` | `inl_move` | Move a function/export from one file to another, updating imports |

## Notes

- All operations default to **dry run** (`apply: false`). Set `apply: true` to write changes.
- Operations are regex-based (not AST). Works well for simple, single-line definitions.
- `inline`: supports `const NAME = VALUE;`, arrow functions `const NAME = (p) => expr;`, and single-line `function NAME(p) { return expr; }`.
- `extract`: detects variables declared before the selection and promotes them to parameters.
- `move`: updates the source file with an import pointing to the target when the symbol was exported.
