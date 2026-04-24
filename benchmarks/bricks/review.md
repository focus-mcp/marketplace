# Fiche brick — review

**Domaine** : Structured code review — analyze code quality, security, architecture patterns, compare versions.
**Prefix** : `rev`
**Tools** : 4 (`code`, `security`, `architecture`, `compare`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 1,513,145 | 909,101 | -39.9% |
| cache_creation | 49,655 | 61,920 | |
| cache_read | 1,455,901 | 839,328 | |
| output | 7,509 | 7,716 | |
| Turns (SDK) | 33 | 29 | |
| Duration (s) | 159.7 | 160.8 | +1% |

## Mini-task (iso)

Using the `rev__code` tool (code quality review), review the file `packages/core/metadata-scanner.ts` in the NestJS test repository. Identify every method that is annotated with the `@deprecated` JSDoc tag in its documentation comment. Report the names of those methods as a comma-separated list, sorted alphabetically.

The expected answer format is: a comma-separated list of method names (no file paths, no descriptions), sorted alphabetically. Example format: `methodA, methodB`.

## Tool coverage (brick mode)

- `rev_code` : not called ⚠️
- `rev_security` : not called ⚠️
- `rev_architecture` : not called ⚠️
- `rev_compare` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: `getAllFilteredMethodNames, scanFromPrototype`

**Brick answer**: PARTIAL — brick failed to load; `rev__code` tool was never available

**Match**: partial

## Observations

- Meta/orchestration brick (code review). 0/4 coverage — brick tools could not be activated (load failure). Moderate savings (Δ=-39.9%) driven purely by context reduction, not review tool usage.
- Brick ran 29 turns vs native's 33, but the brick answer is partial/unavailable due to load failure. The savings are not attributable to review intelligence.
- Both native and brick required high turn counts (29/33) for this task, indicating the review domain is inherently turn-intensive.

## Auto-detected issues

- Tools not called: `rev_code`, `rev_security`, `rev_architecture`, `rev_compare`
- Turns > 15 (brick): 29
- Turns > 15 (native): 33
- Brick answer is partial/not found

## Recommendations

- 🔧 Fix the `review` brick load failure before re-benching — the 0/4 coverage invalidates the measurement.
- 📝 Re-measure in Phase 2b with a task that specifically exercises `rev_security` and `rev_architecture` to assess structured review quality vs native free-form review.
