---
"@focus-mcp/brick-echo": patch
"@focus-mcp/brick-aiteam": patch
"@focus-mcp/brick-codebase": patch
"@focus-mcp/brick-codemod": patch
"@focus-mcp/brick-devtools": patch
"@focus-mcp/brick-filesystem": patch
"@focus-mcp/brick-knowledgebase": patch
---

test(integration): Wave 5.7 — add integration tests for echo and 6 meta-bundle bricks

Covers 8 scenarios across 7 bricks:
- echo: echo_say/happy (message='hello' → output.message='hello'),
  echo_say/empty-message (adversarial: message='' → output.message='' no error)
- aiteam, codebase, codemod, devtools, filesystem, knowledgebase: smoke tests
  (manifest shape, start()/stop() no-op, no bus handlers registered)

Meta-bundle finding: all 6 composite bricks have tools:[] and a no-op start().
Tools are delegated entirely to dependency bricks at runtime — runTool() is not
applicable. Smoke tests verify the brick contract (manifest, lifecycle) and
serve as documentary evidence that the module loads without error.

All packages updated with test:integration script.
