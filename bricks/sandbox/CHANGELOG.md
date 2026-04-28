# @focus-mcp/brick-sandbox

## 1.2.2

### Patch Changes

- 689dba3: fix(lint): fix biome errors (useTemplate, useOptionalChain, noTemplateCurlyInString)
- 920c331: fix(sandbox): cap logs[], result, and content payloads (UTF-8 byte-safe truncation)

  Resolves +42% token regression caught by Wave 4.4 integration tests:

  - box_run/box_file logs[]: now capped at 256 lines × 1KB per line
  - box_run result: capped at 4KB
  - box_read content: capped at 16KB
  - All truncation is UTF-8 byte-safe via Buffer + TextDecoder

- 69bd0b4: chore(bench): per-brick maxTurns hint + auto-retry on max_turns escalation

  - bricks/parallel and bricks/sandbox declare bench.maxTurns: 40 in manifest
  - harness sweep reads the hint and uses max(global, manifest)
  - runBrickWithRetry escalates to maxTurns × 2 on first max_turns failure

## 1.2.0

### Minor Changes

- lastversion: fix handler registration so tools actually dispatch (was throwing "No handler registered" on every call).
  sandbox: add TypeScript transpile (esbuild) and controlled box_read(path) tool — makes the brick actually usable on a codebase.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
