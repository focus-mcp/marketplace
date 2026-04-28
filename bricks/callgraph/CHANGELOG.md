# @focus-mcp/brick-callgraph

## 1.2.0

### Minor Changes

- f581e41: Multi-language support via bus.request to treesitter brick (Option A pattern).
  Replaces hardcoded TS/JS extensions with dynamic list from treesitter:supported-exts.
  Uses treesitter:extract-calls for buildCallMap (cgChain, cgDepth).
  Adds dependencies: ["treesitter"] to manifest.

## 1.1.1

### Patch Changes

- Add required `version` field to mcp-brick.json. Without it, CLI 1.4.0's SemVer validator rejects the manifest on focus start.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
