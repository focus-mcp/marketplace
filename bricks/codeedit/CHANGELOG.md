# @focus-mcp/brick-codeedit

## 1.2.0

### Minor Changes

- Critical safety fixes:
  - ce_insertafter: disambiguate multiple anchor matches (no more silent wrong-location insertion).
  - ce_replacebody: use php-parser AST for real syntax parsing (fixes single-line PHP functions).
  - Both tools: dryRun option + post-edit syntax validation + rollback on failure.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
