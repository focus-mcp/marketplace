---
"@focus-mcp/brick-callgraph": minor
---

Multi-language support via bus.request to treesitter brick (Option A pattern).
Replaces hardcoded TS/JS extensions with dynamic list from treesitter:supported-exts.
Uses treesitter:extract-calls for buildCallMap (cgChain, cgDepth).
Adds dependencies: ["treesitter"] to manifest.
