# @focusmcp/treesitter

Regex-based code indexer for FocusMCP — parses TypeScript/JavaScript symbols, imports, and exports.

> MVP implementation uses regex patterns instead of native tree-sitter bindings.
> Covers TypeScript and JavaScript. Native tree-sitter support planned for a future version.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `index` | `ts_index` | Index a directory (parse all TS/JS files) |
| `reindex` | `ts_reindex` | Re-index a single file |
| `status` | `ts_status` | Index status: file count, symbol count |
| `cleanup` | `ts_cleanup` | Clear the entire index |
| `langs` | `ts_langs` | List supported languages |
