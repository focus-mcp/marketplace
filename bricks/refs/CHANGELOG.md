# @focus-mcp/brick-refs

## 1.2.1

### Patch Changes

- eb10354: chore: add keywords and recommendedFor to manifest

## 1.2.0

### Minor Changes

- bfb55a9: Multi-language support via bus.request to treesitter brick (Option A pattern).
  Replaces TS/JS-only text search with bus calls to treesitter:extract-refs and treesitter:extract-symbols.
  Adds dependencies: ["treesitter"] to manifest.

## 1.1.1

### Patch Changes

- 5d4b7cd: docs(bricks): add measured economy section to per-brick READMEs

  For 14 bricks measured in `benchmarks/equivalence-report.md`, each README now
  shows the static benchmark numbers (native vs brick output, % savings).
  Optional `bench` field in mcp-brick.json exposes the same data programmatically
  for catalog consumers (field is ignored by build-catalog, schema unaffected).

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
