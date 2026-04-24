# @focus-mcp/brick-lastversion

## 1.2.0

### Minor Changes

- lastversion: fix handler registration so tools actually dispatch (was throwing "No handler registered" on every call).
  sandbox: add TypeScript transpile (esbuild) and controlled box_read(path) tool — makes the brick actually usable on a codebase.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
