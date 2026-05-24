---
"@focus-mcp/brick-treesitter": patch
---

fix(treesitter): vendor tree-sitter-twig.wasm to remove the broken upstream install script

`tree-sitter-twig@0.8.2` declares `"install": "node-gyp rebuild"` in its `package.json` but ships no `binding.gyp` in its npm tarball. The install therefore fails on every machine — even with a working C/C++ toolchain — and previously broke `npm install @focus-mcp/brick-treesitter` outright. Marking the dependency `optional` (1.3.2) was not enough: depending on the npm/pnpm version, an `install`-script failure can still abort the whole brick install.

Since the brick only needs the prebuilt `.wasm` file (it never uses the native bindings), the fix is to vendor it. Changes:

- Copy `tree-sitter-twig.wasm` (compiled with tree-sitter-cli 0.26.8) into `bricks/treesitter/wasms/` with an MPL-2.0 REUSE `.license` sidecar.
- Add `LICENSES/MPL-2.0.txt`.
- `src/parsers/twig.ts` now resolves the `.wasm` from `bundled-wasm-path` via `import.meta.url` (no `require.resolve` on `tree-sitter-twig`).
- Remove `tree-sitter-twig` from `optionalDependencies` — no longer pulled at install time.
- Add `wasms/` to `package.json` `files`.
- Update `THIRD_PARTY_LICENSES.md` to document the vendoring rationale.

Twig support continues to work end-to-end (12/12 integration tests, including the Twig block extraction test). Users who install this brick no longer trigger `node-gyp` at all.
