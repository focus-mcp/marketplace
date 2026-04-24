# Fiche brick — parallel

**Domaine** : Parallel execution coordination — run tasks concurrently, collect results, merge outputs, handle timeouts.
**Prefix** : `par`
**Tools** : 4 (`run`, `collect`, `merge`, `timeout`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 579,199 | 727,737 | +25.6% ⚠️ |
| cache_creation | 91,121 | 101,121 | |
| cache_read | 485,309 | 611,937 | |
| output | 2,741 | 14,598 | |
| Turns (SDK) | 8 | 20 | |
| Duration (s) | 52.7 | 206.1 | +291% ⚠️ |

## Mini-task (iso)

Using the `repos` brick in `./test-repo/`, determine the total number of TypeScript (`.ts`) files and the total number of lines across those files in the `test-repo/packages/core` subdirectory (excluding any `node_modules` directories).

Steps to reproduce with the brick:
1. Register `test-repo/packages/core` as a repository (e.g. name it `core`) using the `repos__register` tool, providing the absolute path to `test-repo/packages/core`.
2. Call `repos__stats` with `{"name": "core"}` to retrieve file and line count statistics.
3. Report the TypeScript file count and total line count.

Expected answer format: two integers on one line, separated by a comma — `<file_count>, <line_count>` — where file count is the number of `.ts` files and line count is the total lines across all `.ts` files in `test-repo/packages/core` (excluding `node_modules`).

Do NOT include the answer in this spec.

---

## Tool coverage (brick mode)

- `par_run` : called ✓
- `par_collect` : called ✓
- `par_merge` : not called ⚠️
- `par_timeout` : not called ⚠️

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: 259 files, 29515 lines

**Brick answer**: 259, 29515

**Match**: divergent (manual check needed)

## Observations

- Brick is regressive: +25.6% tokens, +291% duration, 20 turns. Coverage 2/4 — agent used `par_run` and `par_collect`. The task required `repos` brick (not `parallel`), but `repos` failed to load (ENOENT), so the agent fell back to using `parallel` for the computation.
- The `par_run` + `par_collect` approach to compute file/line counts involved many iterations, explaining the 291% duration regression. The final answer matches native ✓ (259 files, 29515 lines).
- The overhead is a dependency-gap artifact (wrong brick loaded for the task, then working around `repos` load failure).

## Auto-detected issues

- Tools not called: `par_merge`, `par_timeout`
- Turns > 15 (brick): 20
- Brick notes flagged: failed — "The `repos` brick (specified in the task steps) could not be loaded — `focus_install` fetched it but `focus_load` failed with ENOENT. The task was solved using the available `parallel` brick's `par_ru"
- Brick slower than native by 291% (UX concern)
- Brick uses MORE tokens than native (727,737 vs 579,199)

## Recommendations

- 🔧 Fix `repos` brick ENOENT load failure (separate issue from `parallel`) — this measurement is contaminated by a different brick's failure.
- 📝 Re-bench `parallel` with a task that directly exercises `par_run`/`par_collect` without a `repos` dependency to get a clean measurement.
