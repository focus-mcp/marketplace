# Fiche brick — filesearch

**Domaine** : Search and replace in files — regex search, in-place replace.
**Prefix** : `fsrch`
**Tools** : 2 (`search`, `replace`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 386,765 | 136,347 | -64.7% |
| cache_creation | 17,050 | 13,158 | |
| cache_read | 366,427 | 121,625 | |
| output | 3,258 | 1,538 | |
| Turns (SDK) | 11 | 6 | |
| Duration (s) | 76.0 | 31.0 | -59% |

## Mini-task (iso)

Using the `filesearch` brick's `search` tool, find all TypeScript files (matching glob `*.ts`) within the `test-repo/packages` directory tree that contain the JSDoc `@deprecated` annotation (exact string `@deprecated`). Report only the file paths, one per line, sorted alphabetically. The paths should be relative to the session working directory (i.e., starting with `test-repo/packages/…`).

## Tool coverage (brick mode)

- `fsrch_search` : called ✓
- `fsrch_replace` : not called ⚠️

**Coverage score**: 1/2 tools used

## Answers comparison

**Native answer**: ```
  test-repo/packages/common/pipes/file/max-file-size.validator.ts
  test-repo/packages/core/metadata-scanner.ts
  test-repo/packages/microservices/external/kafka.interface.ts
  ```
```

**Brick answer**: ```
  test-repo/packages/common/pipes/file/max-file-size.validator.ts
  test-repo/packages/core/metadata-scanner.ts
  test-repo/packages/microservices/external/kafka.interface.ts
  ```
```

**Match**: ✓ identical

## Observations

- Strong token savings (Δ=-64.7%) and wall-clock improvement (duration ratio 0.41x). Agent completed the task with 1/2 tools (`fsrch_search`). Answers match native ✓ (identical 3-file list). The brick provides genuine leverage for regex file search tasks.
- `fsrch_replace` is not called because the task is read-only (find files, don't modify them). This is expected behavior.

## Auto-detected issues

- Tools not called: `fsrch_replace`

## Recommendations

- 🟢 Keep as-is — `fsrch_search` is working as intended.
- 📝 Consider enriching the `fsrch_replace` description to clarify it's for in-place mutation, so agents don't confuse it with search.
