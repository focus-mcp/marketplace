---
"@focus-mcp/brick-treesitter": minor
---

feat(treesitter): add YAML language support (.yaml, .yml)

Extends multi-language coverage with YAML — useful for k8s manifests,
GitHub Actions workflows, Symfony configs, OpenAPI specs, docker-compose, etc.
Now supports 8 languages: TS, JS, PHP, Python, Go, Rust, Java, YAML.

Grammar from `@tree-sitter-grammars/tree-sitter-yaml` (not bundled in `@vscode/tree-sitter-wasm`).
Top-level mapping keys are extracted as `variable` symbols.
