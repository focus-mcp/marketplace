# @focus-mcp/brick-fts

## 1.1.2

### Patch Changes

- 78cc06f: fix(fts): split camelCase/PascalCase identifiers and index filenames

  `tokenize()` now splits compound identifiers (PascalCase, camelCase, ACRONYM+Word) at case transitions while preserving the lowercase compound for exact matches. `ftsIndex()` now also indexes filename tokens, so a file like `DT_PurchasableRewardPools.json` is discoverable by name even when the identifier is absent from its content.

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
