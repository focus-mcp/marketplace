---
"@focus-mcp/brick-depgraph": minor
---

Multi-language support via bus.request to treesitter brick (Option A pattern).
Replaces hardcoded TS/JS extensions with dynamic list from treesitter:supported-exts.
Uses treesitter:extract-imports for import extraction (bus-enhanced with regex fallback).
Adds dependencies: ["treesitter"] to manifest.
