# @focus-mcp/brick-treesitter

## 1.3.3

### Patch Changes

- c79dd71: fix(treesitter): make tree-sitter-twig an optionalDependency to avoid node-gyp install failures

  `tree-sitter-twig@0.8.2` ships with `"install": "node-gyp rebuild"` which compiles native Node bindings. On machines without a C/C++ build toolchain (or Python for node-gyp), this install step fails and breaks the entire `npm install @focus-mcp/brick-treesitter` — even though the brick only uses the bundled `.wasm` file from the same package, never the native bindings.

  Two changes:

  - `package.json`: move `tree-sitter-twig` from `dependencies` to `optionalDependencies`. npm/pnpm now tolerate install-script failures for this package.
  - `src/parsers/twig.ts`: wrap `require.resolve('tree-sitter-twig/tree-sitter-twig.wasm')` in a try/catch. If the package isn't present (install skipped/failed), Twig support is silently disabled — `.twig` files are no longer registered, but the rest of the brick (TypeScript, Python, PHP, Go, Rust, etc.) still works.

  Users on machines with a working build toolchain see no change; users without one can finally install the brick without errors.

- c0acf7c: fix(treesitter): vendor tree-sitter-twig.wasm to remove the broken upstream install script

  `tree-sitter-twig@0.8.2` declares `"install": "node-gyp rebuild"` in its `package.json` but ships no `binding.gyp` in its npm tarball. The install therefore fails on **every** machine (with or without a C/C++ toolchain — node-gyp has nothing to build), and previously broke `npm install @focus-mcp/brick-treesitter` outright. Marking the dependency `optional` (1.3.2) was not enough: depending on the npm/pnpm version, an `install`-script failure can still abort the whole brick install.

  Since the brick only needs the prebuilt `.wasm` file (it never uses the native bindings), the fix is to vendor it. Changes:

  - Copy `tree-sitter-twig.wasm` (compiled with tree-sitter-cli 0.26.8) into `bricks/treesitter/wasms/` with an MPL-2.0 REUSE `.license` sidecar.
  - Add `LICENSES/MPL-2.0.txt`.
  - `src/parsers/twig.ts` now resolves the `.wasm` via a filesystem path computed from `import.meta.url` pointing at the bundled `wasms/` directory (no `require.resolve` on `tree-sitter-twig`).
  - Remove `tree-sitter-twig` from `optionalDependencies` — no longer pulled at install time.
  - Add `wasms/` to `package.json` `files`.
  - Update `THIRD_PARTY_LICENSES.md` to document the vendoring rationale.

  Twig support continues to work end-to-end (12/12 integration tests, including the Twig block extraction test). Users who install this brick no longer trigger `node-gyp` at all.

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
