# Fiche brick — fileops

**Domaine** : File operations — move, copy, delete, rename.
**Prefix** : `fo`
**Tools** : 4 (`move`, `copy`, `delete`, `rename`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 487,750 | 656,632 | +34.6% ⚠️ |
| cache_creation | 33,984 | 65,852 | |
| cache_read | 449,814 | 580,467 | |
| output | 3,919 | 10,225 | |
| Turns (SDK) | 12 | 17 | |
| Duration (s) | 86.6 | 228.7 | +164% ⚠️ |

## Mini-task (iso)

Using file operation tools, perform the following two operations on the NestJS test repository located at `test-repo/packages/common/services/`:

1. **Copy** the file `test-repo/packages/common/services/logger.service.ts` to a new file `test-repo/packages/common/services/logger-copy.service.ts` (same directory, new name).
2. **Rename** the file `test-repo/packages/common/services/console-logger.service.ts` to `console.service.ts` within the same directory (i.e., the result lives at `test-repo/packages/common/services/console.service.ts`).

After completing both operations, list all entries (files and directories) **directly** inside `test-repo/packages/common/services/` (non-recursive — do not descend into subdirectories), sorted alphabetically, one per line, reporting only the basename (not the full path).

Expected answer format: basenames only, one per line, alphabetically sorted.

---

## Tool coverage (brick mode)

- `fo_move` : called ✓
- `fo_copy` : called ✓
- `fo_delete` : not called ⚠️
- `fo_rename` : called ✓

**Coverage score**: 3/4 tools used

## Answers comparison

**Native answer**: ```
  console.service.ts
  index.ts
  logger-copy.service.ts
  logger.service.ts
  utils
... (6 total)
```

**Brick answer**: ```
analytics.service.ts
auth.service.ts
cache.service.ts
email.service.ts
logger-copy.service.ts
... (10 total)
```

**Match**: divergent (manual check needed)

## Observations

- Brick is regressive: +34.6% tokens, +164% duration. Coverage 3/4 — agent used `move`, `copy`, and `rename`. However answers diverge significantly (brick answer lists 10 files in a wrong directory while native correctly lists 6 files in the right directory).
- The brick appears to have operated on a different working directory or performed operations on incorrect paths — the answer set is completely different from the expected output, indicating a path-resolution bug.
- The high duration regression (+164%) is consistent with the agent retrying failed operations.

## Auto-detected issues

- Tools not called: `fo_delete`
- Turns > 15 (brick): 17
- Brick slower than native by 164% (UX concern)
- Brick uses MORE tokens than native (656,632 vs 487,750)

## Recommendations

- 🔧 Audit `fo_copy`, `fo_rename`, and `fo_move` for path resolution — the brick appears to be operating on a different CWD than the task specified.
- 🔧 Add explicit `cwd`/`basePath` validation to prevent silent wrong-directory operations.
