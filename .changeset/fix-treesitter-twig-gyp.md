---
"@focus-mcp/brick-treesitter": patch
---

Skip native build of tree-sitter-twig, @tree-sitter-grammars/tree-sitter-toml, and @tree-sitter-grammars/tree-sitter-yaml to fix install failures on platforms without C++ build tools (ARM, Windows without Visual Studio, minimal Docker images). The prebuilt .wasm shipped in each tarball is used directly via pnpm.neverBuiltDependencies at workspace root.
