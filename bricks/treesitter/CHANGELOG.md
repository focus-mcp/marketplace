# @focus-mcp/brick-treesitter

## 1.2.0

### Minor Changes

- cdb9a7d: feat(treesitter): real tree-sitter parser with multi-language support

  Replaces the regex-based TS/JS-only parser with a real tree-sitter implementation
  using `@vscode/tree-sitter-wasm`. Supported languages: TypeScript (.ts, .tsx),
  JavaScript (.js, .jsx, .mjs, .cjs), PHP (.php), Python (.py), Go (.go), Rust (.rs),
  Java (.java). Bricks downstream (callgraph, depgraph, symbol, refs, outline)
  automatically gain multi-language support. API is backward compatible — same
  `SymbolInfo` and `IndexedFile` types, `parseFile` is now async.

## 1.1.1

### Patch Changes

- Add required `version` field to mcp-brick.json. Without it, CLI 1.4.0's SemVer validator rejects the manifest on focus start.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
