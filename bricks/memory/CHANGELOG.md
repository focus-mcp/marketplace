# @focus-mcp/brick-memory

## 1.1.2

### Patch Changes

- 4854466: fix(memory): cap mem_list to 100 entries by default (override via limit param)

  Bounds the worst-case payload for users with many memory entries.
  Adds total count to reflect truncation.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
