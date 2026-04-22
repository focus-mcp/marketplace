# @focus-mcp/rename

Rename refactoring — rename symbols across files, rename files with import updates, bulk rename with preview.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `symbol` | `ren_symbol` | Rename a symbol across all matching files (dry run by default) |
| `file` | `ren_file` | Rename a file and update all imports referencing it |
| `bulk` | `ren_bulk` | Rename multiple symbols in one coordinated operation |
| `preview` | `ren_preview` | Preview all occurrences of a symbol without mutating files |

## Usage

### Dry run (default)

All tools default to `apply: false`, returning a preview of changes without touching the filesystem.

### Symbol rename

```json
{
  "tool": "ren_symbol",
  "dir": "/project/src",
  "oldName": "handleRequest",
  "newName": "processRequest",
  "apply": true
}
```

### File rename with import updates

```json
{
  "tool": "ren_file",
  "path": "/project/src/utils.ts",
  "newName": "helpers.ts",
  "dir": "/project/src",
  "apply": true
}
```

### Bulk rename

```json
{
  "tool": "ren_bulk",
  "dir": "/project/src",
  "renames": [
    { "oldName": "Foo", "newName": "Bar" },
    { "oldName": "fooHelper", "newName": "barHelper" }
  ],
  "apply": true
}
```

### Preview occurrences

```json
{
  "tool": "ren_preview",
  "dir": "/project/src",
  "oldName": "legacyMethod"
}
```
