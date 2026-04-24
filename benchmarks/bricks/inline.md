# Fiche brick — inline

**Domaine** : Inline, extract, and move refactoring — inline variables/functions, extract code to new functions, move between files.
**Prefix** : `inl`
**Tools** : 3 (`inline`, `extract`, `move`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 660,125 | 241,572 | -63.4% |
| cache_creation | 22,343 | 28,351 | |
| cache_read | 632,178 | 207,960 | |
| output | 5,558 | 5,222 | |
| Turns (SDK) | 18 | 8 | |
| Duration (s) | 91.3 | 93.4 | +2% |

## Mini-task (iso)

In `test-repo/packages/common/utils/load-package.util.ts`, the arrow-function constant `MISSING_REQUIRED_DEPENDENCY` is defined on lines 3–4 and called exactly once on line 16 (inside the `catch` block of `loadPackage`). Using the `inline` tool (or equivalent inline-refactoring logic), inline `MISSING_REQUIRED_DEPENDENCY`: substitute the actual arguments (`packageName`, `context`) for the parameters (`name`, `reason`) in the template-literal body, remove the constant definition, and report the **exact resulting `logger.error(…)` call line** as it would appear in the file after inlining (preserve original indentation). The answer must be a single line of TypeScript code.

---

## Tool coverage (brick mode)

- `inl_inline` : called ✓
- `inl_extract` : not called ⚠️
- `inl_move` : not called ⚠️

**Coverage score**: 1/3 tools used

## Answers comparison

**Native answer**: `    logger.error(\`The "${packageName}" package is missing. Please, make sure to install it to take advantage of ${context}.\`);`

**Brick answer**: `    logger.error(\`The "${packageName}" package is missing. Please, make sure to install it to take advantage of ${context}.\`);`

**Match**: ✓ identical

## Observations

- Good token savings (Δ=-63.4%) with near-neutral wall-clock (+2% — within noise). Agent completed the task with 1/3 tools (`inl_inline`). Answers match native ✓ (identical inlined line). The brick provides genuine leverage for inline refactoring tasks.
- `inl_extract` and `inl_move` are orthogonal operations (extract to new function, move between files) not needed for an inline task.

## Auto-detected issues

- Tools not called: `inl_extract`, `inl_move`
- Turns > 15 (native): 18

## Recommendations

- 🟢 Keep as-is — `inl_inline` is working correctly.
- 📝 Consider enriching sibling tool descriptions so agents reach `inl_extract` for extract-to-function refactors and `inl_move` for cross-file moves.
