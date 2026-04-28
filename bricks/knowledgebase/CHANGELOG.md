# @focus-mcp/brick-knowledgebase

## 1.1.1

### Patch Changes

- 5f64141: test(integration): Wave 5.7 — add integration tests for echo and 6 meta-bundle bricks

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

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
