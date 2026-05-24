# @focus-mcp/brick-treesitter

## 1.3.3

### Patch Changes

- c0acf7c: fix(treesitter): vendor `tree-sitter-twig.wasm` so `npm install` no longer triggers node-gyp

  `tree-sitter-twig@0.8.2` declares `"install": "node-gyp rebuild"` in its `package.json` but ships no `binding.gyp` in its npm tarball — the install fails on every machine (with or without a C/C++ toolchain). The 1.3.2 workaround marked it `optional`, but depending on the npm/pnpm version an install-script failure on an optional dep can still abort the whole brick install.

  The brick only needs the prebuilt `.wasm` (it never uses the native bindings), so the durable fix is to vendor it:

  - Bundle `tree-sitter-twig.wasm` (compiled with tree-sitter-cli 0.26.8) under `bricks/treesitter/wasms/` with an MPL-2.0 REUSE `.license` sidecar. Add `LICENSES/MPL-2.0.txt`.
  - `src/parsers/twig.ts` now resolves the `.wasm` via a filesystem path computed from `import.meta.url` pointing at the bundled `wasms/` directory (no more `require.resolve('tree-sitter-twig/...')`).
  - Remove `tree-sitter-twig` from `optionalDependencies` entirely — it's no longer pulled at install time at all.
  - Add `wasms/` to `package.json` `files` so the directory ships in the npm tarball.
  - Update `THIRD_PARTY_LICENSES.md` to document the vendoring rationale.

  Twig support continues to work end-to-end (46/46 unit + 12/12 integration tests, including the Twig block extraction test). Users who install this brick no longer trigger `node-gyp` at all.

## 1.3.1

### Patch Changes

- eb10354: chore: add keywords and recommendedFor to manifest

## 1.3.0

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

- f581e41: Add 4 new internal bus services for code-intel bricks:
  - treesitter:extract-imports — import statement extraction
  - treesitter:extract-refs — identifier reference finding
  - treesitter:extract-calls — caller/callee extraction
  - treesitter:extract-outline — hierarchical symbol outline

### Patch Changes

- c3857eb: Skip native build of tree-sitter-twig, @tree-sitter-grammars/tree-sitter-toml, and @tree-sitter-grammars/tree-sitter-yaml to fix install failures on platforms without C++ build tools (ARM, Windows without Visual Studio, minimal Docker images). The prebuilt .wasm shipped in each tarball is used directly via pnpm.neverBuiltDependencies at workspace root.

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
