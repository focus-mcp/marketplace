# Fiche brick — filelist

**Domaine** : List directory contents — entries, tree, glob, find.
**Prefix** : `fl`
**Tools** : 4 (`list`, `tree`, `glob`, `find`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 548,477 | 207,965 | -62.1% |
| cache_creation | 33,114 | 32,323 | |
| cache_read | 512,286 | 172,701 | |
| output | 3,041 | 2,909 | |
| Turns (SDK) | 12 | 8 | |
| Duration (s) | 64.0 | 51.3 | -20% |

## Mini-task (iso)

Using the `filelist` brick's `glob` tool (pattern `**/index.ts`, path pointing to `test-repo/packages/`) or its `find` tool (name `index.ts`), locate every file named exactly `index.ts` that sits **directly inside** a first-level package subdirectory of `test-repo/packages/` (i.e., depth = 2 from the repo root, matching `packages/<package-name>/index.ts`). Return the list of matching paths, relative to `test-repo/`, sorted alphabetically — one path per line.

---

## Tool coverage (brick mode)

- `fl_list` : not called ⚠️
- `fl_tree` : not called ⚠️
- `fl_glob` : called ✓
- `fl_find` : called ✓

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: ```
  packages/common/index.ts
  packages/core/index.ts
  packages/microservices/index.ts
  packages/platform-express/index.ts
  packages/platform-fastify/index.ts
... (10 total)
```

**Brick answer**: ```
  packages/common/index.ts
  packages/core/index.ts
  packages/microservices/index.ts
  packages/platform-express/index.ts
  packages/platform-fastify/index.ts
... (10 total)
```

**Match**: ✓ identical

## Observations

- Good token savings (Δ=-62.1%) and modest wall-clock improvement (-20%). Coverage 2/4 — agent used both `fl_glob` and `fl_find`. Answers match native ✓ (identical 10-file list).
- Notable: `fl_glob` returned empty results for `**/index.ts` pattern, forcing fallback to `fl_find`. The glob implementation has a depth/anchoring limitation. Despite the fallback, the final answer is correct.
- `fl_list` and `fl_tree` are not called because the task asked for a specific filename match, not a directory listing.

## Auto-detected issues

- Tools not called: `fl_list`, `fl_tree`
- Brick notes flagged: not support — "The `fl_glob` tool returned empty results for both `*/index.ts` and `**/index.ts` patterns, suggesting the glob implementation may not support these patterns correctly or has a path-resolution issue. "
- Native notes flagged: limitation, fallback — "The Glob tool with pattern `*/index.ts` and a directory path returned no results (likely a depth limitation or anchoring behaviour), so a `find` Bash command with `-maxdepth 2` was used as fallback to"

## Recommendations

- 🔧 Fix `fl_glob` to correctly handle `**/` recursive patterns and depth anchoring.
- 🟢 Keep as-is once glob is fixed — savings and correctness are solid.
