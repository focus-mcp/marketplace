# Fiche brick — codeedit

**Domaine** : Precise code editing — replace function bodies, insert before/after, safe delete with dependency check.
**Prefix** : `ce`
**Tools** : 4 (`replacebody`, `insertafter`, `insertbefore`, `safedelete`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 622,686 | 769,185 | +23.5% ⚠️ |
| cache_creation | 32,814 | 44,285 | |
| cache_read | 583,353 | 716,645 | |
| output | 6,477 | 8,156 | |
| Turns (SDK) | 17 | 22 | |
| Duration (s) | 101.0 | 165.8 | +64% ⚠️ |

## Mini-task (iso)

The `codeedit` brick includes a `safedelete` tool that refuses to delete a function/export if any dependents exist in the project. Your task is: **determine all files within `test-repo/` that import `randomStringGenerator` from `packages/common/utils/random-string-generator.util.ts`** — these are the dependents that would cause `safedelete` to refuse the deletion.

Search all TypeScript/JavaScript files under `test-repo/` for any `import` statement that references `randomStringGenerator`. Exclude the source file `packages/common/utils/random-string-generator.util.ts` itself (it does not import the symbol, it defines it).

Return the list of matching file paths relative to `test-repo/` (i.e., starting with `packages/…`), one per line, sorted alphabetically.

---

## Tool coverage (brick mode)

- `ce_replacebody` : not called ⚠️
- `ce_insertafter` : not called ⚠️
- `ce_insertbefore` : not called ⚠️
- `ce_safedelete` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: ```
  packages/common/module-utils/configurable-module.builder.ts
  packages/common/module-utils/utils/generate-options-injection-token.util.ts
  packages/common/test/utils/random-string-generator.util.spec.ts
  packages/core/injector/instance-wrapper.ts
  packages/core/injector/module.ts
... (12 total)
```

**Brick answer**: Unable to determine — the `codeedit` brick's `safedelete` tool could not be loaded. `focus_load "codeedit"` failed with `Cannot find module '@focus-mcp/brick-codeedit'` (the `.focus/bricks/noop.js` stub references the package but it is absent from node_modules). `focus_update` is not implemented; `focus_remove` fails with "Lock entry not found"; reinstalling returns "already installed (version ^0.0.0)". No `mcp__ce__safedelete` (or any `mcp__ce__*`) tools appeared in the deferred tool registry at any point.

**Match**: partial

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `ce_replacebody`, `ce_insertafter`, `ce_insertbefore`, `ce_safedelete`
- Turns > 15 (brick): 22
- Turns > 15 (native): 17
- Brick answer is partial/not found
- Brick slower than native by 64% (UX concern)
- Brick uses MORE tokens than native (769,185 vs 622,686)

## Recommendations

_(empty — to be filled after analysis)_
