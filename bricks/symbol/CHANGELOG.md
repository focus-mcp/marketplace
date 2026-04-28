# @focus-mcp/brick-symbol

## 1.2.0

### Minor Changes

- 17dde5e: feat(code-intel/multilang): pilot multi-language support via EventBus

  Add treesitter:extract-symbols and treesitter:supported-exts internal bus services
  to the treesitter brick. Refactor the symbol brick to consume them via bus.request,
  replacing hardcoded TS/JS regex with tree-sitter parsing for ~50 languages.

  - treesitter: treesitter:extract-symbols service (path + content → symbols/imports/exports)
  - treesitter: treesitter:supported-exts service (returns dynamic extension list)
  - symbol: bus injection pattern (setBus/clearBus), per-file error isolation
  - symbol: dependencies: ["treesitter"] in mcp-brick.json
  - Tests: cross-brick integration tests for TS, PHP, Python

## 1.1.2

### Patch Changes

- 920ce2c: fix(symbol): scope test script to src/ + add test:integration; align with Phase A/B/C pattern

## 1.1.1

### Patch Changes

- Add required `version` field to mcp-brick.json. Without it, CLI 1.4.0's SemVer validator rejects the manifest on focus start.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
