# @focus-mcp/filesystem

Composite filesystem brick for FocusMCP — loads all filesystem sub-bricks.

This is a **composite brick**: it depends on `fileread`, `filewrite`, `filelist`, `fileops`, and `filesearch`.
It exposes no tools of its own — the runtime loads and registers all sub-bricks automatically.

## Dependencies

| Brick | Prefix | Description |
|-------|--------|-------------|
| `fileread` | `fr` | Read files (full, head, tail, range) |
| `filewrite` | `fw` | Write files (write, append, create) |
| `filelist` | `fl` | List directories (list, tree, glob, find) |
| `fileops` | `fo` | File operations (move, copy, delete, rename) |
| `filesearch` | `fsrch` | Search and replace in files |
