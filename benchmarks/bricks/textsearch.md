# Fiche brick — textsearch

**Domaine** : Text search and replace across files — regex search, multi-file replace, grouped results.
**Prefix** : `txt`
**Tools** : 4 (`search`, `regex`, `replace`, `grouped`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 363,585 | 149,115 | -59.0% |
| cache_creation | 10,713 | 18,929 | |
| cache_read | 349,745 | 127,082 | |
| output | 3,098 | 3,078 | |
| Turns (SDK) | 11 | 6 | |
| Duration (s) | 50.0 | 42.5 | -15% |

## Mini-task (iso)

Using the **textsearch** brick's `grouped` or `search` tool, find every TypeScript file inside `test-repo/packages/` that contains the exact literal string `@Injectable()`. Return the list of matching file paths **relative to `test-repo/`**, one per line, sorted alphabetically. Use `glob` filter `*.ts` and search `dir` set to `test-repo/packages/`. Do not include non-TypeScript files. The answer format is a plain sorted list of relative paths (e.g. `packages/common/pipes/parse-int.pipe.ts`).

---

## Tool coverage (brick mode)

- `txt_search` : not called ⚠️
- `txt_regex` : not called ⚠️
- `txt_replace` : not called ⚠️
- `txt_grouped` : called ✓

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
packages/common/decorators/core/inject.decorator.ts
packages/common/pipes/default-value.pipe.ts
packages/common/pipes/file/parse-file.pipe.ts
packages/common/pipes/parse-array.pipe.ts
packages/common/pipes/parse-bool.pipe.ts
... (32 total)
```

**Brick answer**: ```
packages/common/decorators/core/inject.decorator.ts
packages/common/pipes/default-value.pipe.ts
packages/common/pipes/file/parse-file.pipe.ts
packages/common/pipes/parse-array.pipe.ts
packages/common/pipes/parse-bool.pipe.ts
... (32 total)
```

**Match**: ✓ identical

## Observations

- Good token savings (Δ=-59%) and modest wall-clock improvement (-15%). Agent completed the task with 1/4 tools (`txt_grouped`). Answers match native ✓ (identical 32-file list). The brick provides genuine leverage for multi-file text search tasks.
- `txt_search`, `txt_regex`, and `txt_replace` serve different scenarios (simple search, regex, in-place replace) not needed for a literal-string find task.

## Auto-detected issues

- Tools not called: `txt_search`, `txt_regex`, `txt_replace`
- Brick notes flagged: fallback — "The `txt_grouped` tool returned results with file paths already relative to the searched `dir` (`test-repo/packages/`), so `packages/` was prepended to produce paths relative to `test-repo/`. Results "

## Recommendations

- 🟢 Keep as-is — `txt_grouped` is working correctly for multi-file literal search.
- 📝 Consider enriching sibling tool descriptions to clarify: `txt_search` for simple single-file, `txt_regex` for pattern matching, `txt_replace` for in-place mutations.
