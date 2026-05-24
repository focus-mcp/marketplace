---
"@focus-mcp/brick-treesitter": patch
---

fix(treesitter): make tree-sitter-twig an optionalDependency to avoid node-gyp install failures

`tree-sitter-twig@0.8.2` ships with `"install": "node-gyp rebuild"` which compiles native Node bindings. On machines without a C/C++ build toolchain (or Python for node-gyp), this install step fails and breaks the entire `npm install @focus-mcp/brick-treesitter` — even though the brick only uses the bundled `.wasm` file from the same package, never the native bindings.

Two changes:

- `package.json`: move `tree-sitter-twig` from `dependencies` to `optionalDependencies`. npm/pnpm now tolerate install-script failures for this package.
- `src/parsers/twig.ts`: wrap `require.resolve('tree-sitter-twig/tree-sitter-twig.wasm')` in a try/catch. If the package isn't present (install skipped/failed), Twig support is silently disabled — `.twig` files are no longer registered, but the rest of the brick (TypeScript, Python, PHP, Go, Rust, etc.) still works.

Users on machines with a working build toolchain see no change; users without one can finally install the brick without errors.
