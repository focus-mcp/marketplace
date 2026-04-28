# @focus-mcp/brick-depgraph

## 1.2.0

### Minor Changes

- 377fd02: Multi-language support via bus.request to treesitter brick (Option A pattern).
  Replaces hardcoded TS/JS extensions with dynamic list from treesitter:supported-exts.
  Uses treesitter:extract-imports for import extraction (bus-enhanced with regex fallback).
  Adds dependencies: ["treesitter"] to manifest.

## 1.1.1

### Patch Changes

- Add required `version` field to mcp-brick.json. Without it, CLI 1.4.0's SemVer validator rejects the manifest on focus start.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
