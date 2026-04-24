# @focus-mcp/brick-metrics

## 1.2.0

### Minor Changes

- fileops: fix path resolution bug that caused operations to target wrong directories (benchmark flagged +379% tokens).
  metrics: move to async fs with batch flush; add met_batch tool to kill per-record fsync overhead (was 506% slower than native).

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
