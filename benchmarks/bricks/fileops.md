# Fiche brick — fileops

**Domaine** : File operations — move, copy, delete, rename.
**Prefix** : `fo`
**Tools** : 4 (`move`, `copy`, `delete`, `rename`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 802,092 | 687,677 | -14.3% |
| cache_creation | 34,547 | 47,262 | |
| cache_read | 761,917 | 633,655 | |
| output | 5,581 | 6,654 | |
| Turns (SDK) | 18 | 21 | |
| Duration (s) | 97.2 | 131.1 | +35% ⚠️ |

## Mini-task (iso)

In the NestJS monorepo at `test-repo/packages/common/services/`, there exists a file `logger-copy.service.ts` that is an exact byte-for-byte duplicate of `logger.service.ts` (both are 9396 bytes and have identical content). This stale copy should be removed.

**Your task**: Delete the file `test-repo/packages/common/services/logger-copy.service.ts`. After deletion, list the **files only** (not directories) that remain in `test-repo/packages/common/services/`, sorted alphabetically, one per line.

Expected answer format: a sorted, newline-separated list of filenames (not full paths) remaining in that directory after the deletion, excluding any subdirectories.

---

## Tool coverage (brick mode)

- `fo_move` : not called ⚠️
- `fo_copy` : not called ⚠️
- `fo_delete` : not called ⚠️
- `fo_rename` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: ```
  console.service.ts
  index.ts
  logger.service.ts
  ```
```

**Brick answer**: INCOMPLETE — the fileops brick could not be loaded; the delete operation was not performed

**Match**: divergent (manual check needed)

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `fo_move`, `fo_copy`, `fo_delete`, `fo_rename`
- Turns > 15 (brick): 21
- Turns > 15 (native): 18
- Brick slower than native by 35% (UX concern)

## Recommendations

_(empty — to be filled after analysis)_
