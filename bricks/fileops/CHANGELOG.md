# @focus-mcp/brick-fileops

## 1.4.0

### Minor Changes

- e375d4d: fix(fileops): fail-fast guard when workRoot is not set + advertise setRoot in tool descriptions

  Resolves the +379% token / 5.82× latency regression caught by Phase C3 integration tests:
  the brick silently operated on the wrong directory when the MCP server was started from
  a different cwd than the agent's workspace. The setRoot tool now MUST be called first,
  or the first non-existent path triggers a descriptive error instead of silent failure.

## 1.2.0

### Minor Changes

- fileops: fix path resolution bug that caused operations to target wrong directories (benchmark flagged +379% tokens).
  metrics: move to async fs with batch flush; add met_batch tool to kill per-record fsync overhead (was 506% slower than native).

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
