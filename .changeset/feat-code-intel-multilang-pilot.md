---
"@focus-mcp/brick-treesitter": minor
"@focus-mcp/brick-symbol": minor
---

feat(code-intel/multilang): pilot multi-language support via EventBus

Add treesitter:extract-symbols and treesitter:supported-exts internal bus services
to the treesitter brick. Refactor the symbol brick to consume them via bus.request,
replacing hardcoded TS/JS regex with tree-sitter parsing for ~50 languages.

- treesitter: treesitter:extract-symbols service (path + content → symbols/imports/exports)
- treesitter: treesitter:supported-exts service (returns dynamic extension list)
- symbol: bus injection pattern (setBus/clearBus), per-file error isolation
- symbol: dependencies: ["treesitter"] in mcp-brick.json
- Tests: cross-brick integration tests for TS, PHP, Python
