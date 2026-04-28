---
'@focus-mcp/brick-treesitter': minor
'@focus-mcp/brick-symbol': minor
---

feat(code-intel/multilang): pilot multi-language support via EventBus

Add `treesitter:extract-symbols` internal service to the treesitter brick.
Refactor the symbol brick to consume it via `bus.request`, enabling PHP, Python,
Go, Rust, Java, and all other tree-sitter-supported languages.

- `treesitter`: exposes `treesitter:extract-symbols` bus handler (path + content → symbols/imports/exports)
- `symbol`: removes hardcoded TS/JS regex; delegates to treesitter via bus; extends file collection to ~50 languages
- `symbol`: declares `dependencies: ["treesitter"]` in manifest (resolved transitively by `focus add`)
- Tests: 32 treesitter unit tests (incl. PHP/Python extract-symbols), 18 symbol unit tests with mock bus, 7 cross-brick integration tests (TS + PHP + Python)
