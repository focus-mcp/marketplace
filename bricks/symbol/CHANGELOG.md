# @focus-mcp/brick-symbol

## 1.1.2

### Patch Changes

- 920ce2c: fix(symbol): scope test script to src/ + add test:integration; align with Phase A/B/C pattern

## 1.1.1

### Patch Changes

- Add required `version` field to mcp-brick.json. Without it, CLI 1.4.0's SemVer validator rejects the manifest on focus start.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
