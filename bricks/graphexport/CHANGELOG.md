# @focus-mcp/brick-graphexport

## 1.2.0

### Minor Changes

- graphexport: add ge_input for standalone use; clarify manifest dep on upstream graph.
  filewrite: add {force} option to fw_create to allow overwrite (safe-by-default preserved).
  convert: fix null-guard in CSV serializer (val.includes on undefined).

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
