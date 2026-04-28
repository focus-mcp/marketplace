---
"@focus-mcp/brick-smartread": minor
---

Multi-language support via bus.request to treesitter brick (Option A pattern).
Replaces hardcoded TS/JS regex parser with bus calls to treesitter:extract-symbols and treesitter:extract-imports.
Adds dependencies: ["treesitter"] to manifest.
