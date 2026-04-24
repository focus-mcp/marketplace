# Fiche brick — session

**Domaine** : Session context save and restore — track loaded files and operations, persist sessions to disk.
**Prefix** : `ses`
**Tools** : 4 (`save`, `restore`, `context`, `history`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 467,493 | 358,075 | -23.4% |
| cache_creation | 15,007 | 39,020 | |
| cache_read | 448,161 | 311,076 | |
| output | 4,290 | 7,927 | |
| Turns (SDK) | 13 | 12 | |
| Duration (s) | 75.5 | 131.4 | +74% ⚠️ |

## Mini-task (iso)

Explore the directory `test-repo/packages/common/exceptions`. That directory contains both TypeScript source files (`.ts`) and backup files (`.bak`). Your task is to identify all `.ts` files that are **not** `index.ts` — these represent the actual exception class files. Save a session named `"exceptions-audit"` using the session brick's `save` tool, with the `files` field set to the sorted list of relative paths (relative to `test-repo/packages/common/exceptions/`) of those exception `.ts` files, and `context` set to `"NestJS common exceptions audit"`. Then call `history` to confirm the session was saved. Report: the sorted list of **filenames** (not full paths) that were stored in the `files` field, one per line, alphabetically ascending.

---

## Tool coverage (brick mode)

- `ses_save` : called ✓
- `ses_restore` : not called ⚠️
- `ses_context` : not called ⚠️
- `ses_history` : called ✓

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: ```
bad-gateway.exception.ts
bad-request.exception.ts
conflict.exception.ts
forbidden.exception.ts
gateway-timeout.exception.ts
... (23 total)
```

**Brick answer**: ```
  bad-gateway.exception.ts
  bad-request.exception.ts
  conflict.exception.ts
  forbidden.exception.ts
  gateway-timeout.exception.ts
... (24 total)
```

**Match**: divergent (manual check needed)

## Observations

- Stateful brick — designed for session save/restore across turns or sessions. Single-task iso-bench cannot exercise session restoration value.
- Modest savings (Δ=-23.4%) but duration regression (+74%). Coverage 2/4 — agent used `ses_save` and `ses_history`. Answers diverge by 1 file (brick: 24, native: 23) — likely an extra `.bak` file included.
- The duration regression is caused by the brick having no filesystem discovery tools: the agent couldn't enumerate files with brick tools alone and had to work around it.

## Auto-detected issues

- Tools not called: `ses_restore`, `ses_context`
- Brick notes flagged: fallback — "The `mcp__focus__` brick tools have no filesystem exploration capability (no directory listing or file-glob tool). Since `Bash`, `Grep`, `Glob`, `Edit`, and `Write` are all forbidden, filesystem disco"
- Brick slower than native by 74% (UX concern)

## Recommendations

- 🔧 Re-bench with `session` + `filelist` co-loaded to remove the filesystem discovery gap.
- 🔧 Re-bench in Phase 2b multi-task scenario (save session, resume later) to measure real session-restore value.
- 📝 Do not use single-task numbers for marketing on this brick.
