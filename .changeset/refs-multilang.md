---
"@focus-mcp/brick-refs": minor
---

Multi-language support via bus.request to treesitter brick (Option A pattern).
Replaces TS/JS-only text search with bus calls to treesitter:extract-refs and treesitter:extract-symbols.
Adds dependencies: ["treesitter"] to manifest.
