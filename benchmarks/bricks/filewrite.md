# Fiche brick — filewrite

**Domaine** : Write files — create, overwrite, append.
**Prefix** : `fw`
**Tools** : 3 (`write`, `append`, `create`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 688,365 | 537,158 | -22.0% |
| cache_creation | 19,283 | 52,726 | |
| cache_read | 664,008 | 479,306 | |
| output | 5,026 | 5,049 | |
| Turns (SDK) | 19 | 9 | |
| Duration (s) | 87.4 | 147.1 | +68% ⚠️ |

## Mini-task (iso)

Inspect all `.ts` files in `test-repo/packages/common/exceptions/` and create a new file at `test-repo/packages/common/exceptions/EXCEPTIONS.md`. The file must contain a markdown bullet list of all exception class names exported (lines starting with `export class`) from those `.ts` files, sorted alphabetically, one per line, using the format `- ClassName` (a dash, a space, then the class name with no trailing text). No header, no blank lines, no other content. Use the filewrite brick's `create` tool to write this file.

Expected answer format: the exact file content — 23 lines, each `- <ClassName>` sorted alphabetically, newline-terminated.

## Tool coverage (brick mode)

- `fw_write` : called ✓
- `fw_append` : not called ⚠️
- `fw_create` : called ✓

**Coverage score**: 2/3 tools used

## Answers comparison

**Native answer**: ```
  - BadGatewayException
  - BadRequestException
  - ConflictException
  - ForbiddenException
  - GatewayTimeoutException
... (24 total)
```

**Brick answer**: ```
- BadGatewayException
- BadRequestException
- ConflictException
- ForbiddenException
- GatewayTimeoutException
... (23 total)
```

**Match**: divergent (manual check needed)

## Observations

- Modest token savings (Δ=-22%) and duration regression (+68%). Coverage 2/3 — agent used `fw_write` and `fw_create`. Answer is partial: 23 lines vs native's 24 — one exception class was missed.
- Two issues: (1) `fw_create` failed because the file already existed (no overwrite-or-create semantics), requiring fallback to `fw_write`; (2) the missing exception class may indicate a file-read limitation in the brick context (no file-reading tools co-loaded).
- The duration regression is consistent with the failed `fw_create` attempt consuming extra turns.

## Auto-detected issues

- Tools not called: `fw_append`
- Turns > 15 (native): 19
- Brick notes flagged: failed — "(1) `mcp__focus__fw_create` failed because `EXCEPTIONS.md` already existed in the repo — fell back to `mcp__focus__fw_write` (overwrite) which succeeded. (2) No file-reading brick was available in the"
- Brick slower than native by 68% (UX concern)

## Recommendations

- 🔧 Add `overwrite: boolean` option to `fw_create` or make it idempotent when the file exists.
- 🔧 Audit why one exception class was missed — likely a file-reading gap when no filesystem brick is co-loaded.
- 📝 Document that `filewrite` should be paired with `fileread` or `filesearch` for read-then-write workflows.
