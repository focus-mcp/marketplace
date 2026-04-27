# Third-Party Licenses

This brick bundles or resolves WASM grammars from the following third-party packages.
No WASM files are committed to this repository — all grammars are distributed via npm.

---

## @vscode/tree-sitter-wasm

- **Source**: https://github.com/microsoft/vscode-tree-sitter-wasm
- **License**: MIT
- **Publisher**: Microsoft
- **Used for**: runtime (web-tree-sitter), plus bundled grammars for TypeScript, JavaScript, PHP, Python, Go, Rust, Java, C, C++, C#, Bash, Ruby, CSS, INI, PowerShell, Regex, TSX.

---

## @cursorless/tree-sitter-wasms

- **Source**: https://github.com/cursorless-dev/cursorless/tree/main/packages/cursorless-vscode/src/scripts/packaged-grammars
- **License**: Unlicense (public domain)
- **Publisher**: Cursorless contributors
- **Version**: ^0.8.1 (published 2026-03-30)
- **Used for**: prebuilt WASM grammars for 44 languages including HTML, Markdown, SCSS, JSON, Lua, Kotlin, Swift, Dart, Elixir, Haskell, Scala, Zig, XML, R, Perl, LaTeX, Nix, HCL, Gleam, Elm, GDScript, Clojure, Properties, YAML, and more.

The Unlicense grants any rights to use, copy, modify, distribute, and sell without restriction.

---

## @tree-sitter-grammars/tree-sitter-yaml

- **Source**: https://github.com/tree-sitter-grammars/tree-sitter-yaml
- **License**: MIT
- **Publisher**: tree-sitter-grammars organization
- **Version**: ^0.7.0
- **Used for**: YAML grammar (primary source — shipped as absolute path, not from @vscode bundle).

---

## @tree-sitter-grammars/tree-sitter-toml

- **Source**: https://github.com/tree-sitter-grammars/tree-sitter-toml
- **License**: MIT
- **Publisher**: tree-sitter-grammars organization
- **Version**: ^0.7.0
- **Used for**: TOML grammar (Cargo.toml, pyproject.toml, etc.).

---

## tree-sitter-twig

- **Source**: https://github.com/kaermorchen/tree-sitter-twig
- **License**: MPL-2.0 (Mozilla Public License 2.0)
- **Publisher**: kaermorchen
- **Version**: ^0.8.2 (published 2026-04-03, compiled with tree-sitter-cli 0.26.8)
- **Used for**: Twig template grammar.

**Note on MPL-2.0**: The Mozilla Public License 2.0 is a weak copyleft license. It requires that modifications to the licensed file themselves be made available under MPL-2.0, but it does **not** require the larger work (this brick) to be licensed under MPL-2.0. As this brick only loads the prebuilt WASM binary (no modification), no additional obligations apply.

---

## web-tree-sitter (runtime, indirect)

- **Source**: https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web
- **License**: MIT
- **Used for**: WebAssembly runtime powering all grammar loading and parsing. Bundled inside `@vscode/tree-sitter-wasm`.
