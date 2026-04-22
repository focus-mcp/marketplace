# @focus-mcp/devtools

Composite devtools brick for FocusMCP — loads all developer tools sub-bricks.

This is a **composite brick**: it depends on `shell`, `sandbox`, and `batch`.
It exposes no tools of its own — the runtime loads and registers all sub-bricks automatically.

## Dependencies

| Brick | Prefix | Description |
|-------|--------|-------------|
| `shell` | `sh` | Execute shell commands |
| `sandbox` | `sb` | Run code in an isolated sandbox environment |
| `batch` | `bt` | Execute multiple commands or operations in batch |
