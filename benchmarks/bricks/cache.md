# Fiche brick — cache

**Domaine** : In-memory file cache — avoid redundant disk reads with mtime-based invalidation.
**Prefix** : `cache`
**Tools** : 5 (`get`, `set`, `invalidate`, `warmup`, `stats`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 474,822 | 722,678 | +52.2% ⚠️ |
| cache_creation | 13,569 | 51,859 | |
| cache_read | 457,061 | 661,298 | |
| output | 4,156 | 9,413 | |
| Turns (SDK) | 14 | 20 | |
| Duration (s) | 75.4 | 191.4 | +154% ⚠️ |

## Mini-task (iso)

**Context**: You are working with a NestJS monorepo located at `test-repo/`. Each NestJS package under `test-repo/packages/` exposes a top-level `index.ts` barrel file. These barrel files are the most repeatedly-read files during a build pipeline and are the ideal candidates to pre-load using the cache brick's `warmup` tool.

**Task**: Find all `index.ts` files located exactly one level deep inside `test-repo/packages/` (i.e., matching the pattern `test-repo/packages/<package-name>/index.ts`). List their paths relative to `test-repo/`, one per line, sorted alphabetically. These are the paths that should be passed to `warmup`.

**Expected answer format**: A list of relative file paths (relative to `test-repo/`), one per line, sorted alphabetically. Example format:
```
packages/common/index.ts
packages/core/index.ts
...
```

Do not include paths deeper than one level inside `packages/` (e.g., `packages/common/utils/index.ts` should not appear).

---

## Tool coverage (brick mode)

- `cache_get` : not called ⚠️
- `cache_set` : not called ⚠️
- `cache_invalidate` : not called ⚠️
- `cache_warmup` : not called ⚠️
- `cache_stats` : not called ⚠️

**Coverage score**: 0/5 tools used

## Answers comparison

**Native answer**: ```
  packages/common/index.ts
  packages/core/index.ts
  packages/microservices/index.ts
  packages/platform-express/index.ts
  packages/platform-fastify/index.ts
... (10 total)
```

**Brick answer**: _Unable to determine_ — the cache brick could not be loaded (manifest version `^0.0.0` fails SemVer 2.0 validation; `focus_update` is not yet implemented; `focus_remove` returned "Lock entry not found"). None of the available `mcp__focus__*` tools enumerate the local filesystem, so the `index.ts` paths could not be discovered.

**Match**: partial

## Observations

- Stateful brick — designed for caching repeated file reads across turns. Single-task iso-bench cannot exercise state accumulation, so gains/losses here are not representative.
- The brick failed to load (manifest version `^0.0.0` fails SemVer validation) — 0/5 tool coverage and a regressive result (+52.2% tokens, +154% duration) caused by failed load attempts consuming turns.
- The regression is entirely a loading-failure artifact, not evidence that caching adds overhead when functional.

## Auto-detected issues

- Tools not called: `cache_get`, `cache_set`, `cache_invalidate`, `cache_warmup`, `cache_stats`
- Turns > 15 (brick): 20
- Brick answer is partial/not found
- Brick slower than native by 154% (UX concern)
- Brick uses MORE tokens than native (722,678 vs 474,822)

## Recommendations

- 🔧 Fix manifest version to a valid semver string before re-benching; the regression is a loading artifact.
- 🔧 Re-bench in Phase 2b multi-task scenario (multiple reads of the same files across tasks) to measure real cache hit savings.
- 📝 Do not use single-task numbers for marketing on this brick.
