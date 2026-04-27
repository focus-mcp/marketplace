---
"@focus-mcp/brick-treesitter": minor
---

feat(treesitter): real tree-sitter parser with multi-language support

Replaces the regex-based TS/JS-only parser with a real tree-sitter implementation
using `@vscode/tree-sitter-wasm`. Supported languages: TypeScript (.ts, .tsx),
JavaScript (.js, .jsx, .mjs, .cjs), PHP (.php), Python (.py), Go (.go), Rust (.rs),
Java (.java). Bricks downstream (callgraph, depgraph, symbol, refs, outline)
automatically gain multi-language support. API is backward compatible — same
`SymbolInfo` and `IndexedFile` types, `parseFile` is now async.
