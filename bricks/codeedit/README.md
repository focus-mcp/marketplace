# @focusmcp/codeedit

Precise code editing — replace function bodies, insert before/after, safe delete with dependency check.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `replacebody` | `ce_replacebody` | Replace the body of a function or method by name |
| `insertafter` | `ce_insertafter` | Insert code after a specific line number or pattern match |
| `insertbefore` | `ce_insertbefore` | Insert code before a specific line number or pattern match |
| `safedelete` | `ce_safedelete` | Delete a function/export after checking for dependents |

## Usage

All tools accept an `apply` flag (default `false`) — omit it or set `false` to preview the change without writing to disk.

### replacebody

Replace the entire body of a named function or arrow function.

```json
{
    "path": "src/utils.ts",
    "name": "formatDate",
    "newBody": "    return new Intl.DateTimeFormat('en-US').format(date);",
    "apply": true
}
```

### insertafter

Insert code after a line number or after the first line matching a regex pattern.

```json
{
    "path": "src/index.ts",
    "pattern": "import.*from.*lodash",
    "content": "import { debounce } from 'lodash';",
    "apply": true
}
```

### insertbefore

Insert code before a line number or before the first line matching a regex pattern.

```json
{
    "path": "src/routes.ts",
    "before": 10,
    "content": "// TODO: add auth middleware",
    "apply": true
}
```

### safedelete

Delete a function, refusing if other files depend on it. Use `force: true` to override.

```json
{
    "path": "src/legacy.ts",
    "name": "oldHelper",
    "dir": "src",
    "apply": true
}
```

If dependents are found and `force` is not set, the response includes `blocked: true` and a `dependents` list.
