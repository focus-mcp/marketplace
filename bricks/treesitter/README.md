# @focusmcp/treesitter

Tree-sitter based multi-language code indexer for FocusMCP — parses symbols, imports, and exports.

Supports 8 languages: TypeScript, JavaScript, PHP, Python, Go, Rust, Java, **YAML**.

## Supported languages

| Language | Extensions | Extracted symbols |
|----------|-----------|-------------------|
| TypeScript | `.ts`, `.tsx` | functions, classes, interfaces, types, variables, methods |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | functions, classes, variables, methods |
| PHP | `.php` | functions, classes, methods |
| Python | `.py` | functions, classes, methods |
| Go | `.go` | functions, types, methods |
| Rust | `.rs` | functions, structs, enums, traits, impls |
| Java | `.java` | classes, methods |
| YAML | `.yaml`, `.yml` | top-level mapping keys (k8s manifests, GitHub Actions, OpenAPI, docker-compose, etc.) |

> YAML grammar from `@tree-sitter-grammars/tree-sitter-yaml` — not bundled in `@vscode/tree-sitter-wasm`.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `index` | `ts_index` | Index a directory (parse all supported files) |
| `reindex` | `ts_reindex` | Re-index a single file |
| `status` | `ts_status` | Index status: file count, symbol count, languages |
| `cleanup` | `ts_cleanup` | Clear the entire index |
| `langs` | `ts_langs` | List supported languages |
