# Fiche brick — codeedit

**Domaine** : Precise code editing — replace function bodies, insert before/after, safe delete with dependency check.
**Prefix** : `ce`
**Tools** : 4 (`replacebody`, `insertafter`, `insertbefore`, `safedelete`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 640,131 | 120,711 | -81.1% |
| cache_creation | 30,686 | 14,512 | |
| cache_read | 604,297 | 105,011 | |
| output | 5,106 | 1,165 | |
| Turns (SDK) | 17 | 5 | |
| Duration (s) | 138.1 | 24.0 | -83% |

## Mini-task (iso)

You are evaluating whether the exported function `generateOptionsInjectionToken` — defined in `test-repo/packages/common/module-utils/utils/generate-options-injection-token.util.ts` — can be safely deleted from the project. Using the `codeedit` brick's `safedelete` tool (with `dir` set to `test-repo/packages`), determine whether the deletion is safe or blocked by dependents. The answer must be one of:

- `SAFE` — if no other file in `test-repo/packages/` imports or references `generateOptionsInjectionToken` (i.e., the tool would allow deletion).
- `BLOCKED by: <relative-to-test-repo path(s), sorted alphabetically, one per line>` — listing every file outside the definition file that references the function (i.e., the tool would refuse deletion).

Do **not** actually delete the file. Run `safedelete` with `apply: false` (or omit `apply`) to get a dry-run dependency report. Report the exact answer in the format above.

---

## Tool coverage (brick mode)

- `ce_replacebody` : not called ⚠️
- `ce_insertafter` : not called ⚠️
- `ce_insertbefore` : not called ⚠️
- `ce_safedelete` : called ✓

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: `BLOCKED by: packages/common/module-utils/configurable-module.builder.ts`

**Brick answer**: `BLOCKED by: packages/common/module-utils/configurable-module.builder.ts`

**Match**: ✓ identical

## Observations

- Strong token savings (Δ=-81.1%) and exceptional wall-clock improvement (duration ratio 0.17x — fastest in dataset). Agent completed the task with 1/4 tools (`ce_safedelete`). Answers match native ✓ (identical BLOCKED result). The brick provides genuine leverage for dependency-aware code deletion checks.
- The three remaining tools (`replacebody`, `insertafter`, `insertbefore`) are active-mutation operations not needed for a dry-run dependency check task.
- Output tokens reduced from 5,106 to 1,165 — the brick's structured result is much more compact than native multi-step exploration.

## Auto-detected issues

- Tools not called: `ce_replacebody`, `ce_insertafter`, `ce_insertbefore`
- Turns > 15 (native): 17

## Recommendations

- 🟢 Keep as-is — `ce_safedelete` is working as intended with top-tier savings.
- 📝 Consider enriching tool descriptions so agents discover `ce_replacebody` for refactoring tasks where it provides equivalent leverage.
