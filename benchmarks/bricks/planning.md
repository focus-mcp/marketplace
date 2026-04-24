# Fiche brick — planning

**Domaine** : Structured planning — create plans with steps, dependencies, and time estimates.
**Prefix** : `plan`
**Tools** : 4 (`create`, `steps`, `dependencies`, `estimate`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 637,112 | 708,671 | +11.2% ⚠️ |
| cache_creation | 40,769 | 58,071 | |
| cache_read | 586,860 | 641,851 | |
| output | 9,441 | 8,661 | |
| Turns (SDK) | 15 | 18 | |
| Duration (s) | 132.4 | 159.4 | +20% ⚠️ |

## Mini-task (iso)

Using only the `test-repo/packages/core/middleware/` directory, list every TypeScript file (`.ts`) in that directory **except `index.ts`**, sort them alphabetically, and build a structured migration plan as follows:

- **One step per file** (step title = `Modify <filename>`, time estimate = `1h`)  
- **One trailing step**: `Write unit tests`, estimate `2h`  
- **One final step**: `Update PACKAGE.md`, estimate `30m`  
- **Dependencies**:  
  - `Write unit tests` depends on *all* file-modification steps  
  - `Update PACKAGE.md` depends on `Write unit tests`  

Assuming **no steps are yet complete**, report the following three things (in this format):

```
Ordered step titles (one per line):
<list>

Total estimated time: <N> minutes (<Hh Mm>)
Blocked steps: <count>
```

The file-modification steps must appear in alphabetical order by filename. The two trailing steps (`Write unit tests`, then `Update PACKAGE.md`) follow after all file steps.

---

## Tool coverage (brick mode)

- `plan_create` : called ✓
- `plan_steps` : called ✓
- `plan_dependencies` : called ✓
- `plan_estimate` : called ✓

**Coverage score**: 4/4 tools used

## Answers comparison

**Native answer**: ```
Ordered step titles (one per line):
Modify builder.ts
Modify container.ts
Modify middleware-module.ts
Modify resolver.ts
... (12 total)
```

**Brick answer**: ```
Ordered step titles (one per line):
Modify builder.ts
Modify container.ts
Modify middleware-module.ts
Modify resolver.ts
... (12 total)
```

**Match**: ✓ identical

## Observations

- Meta/orchestration brick (structured planning). Perfect coverage 4/4 — all tools used. Small regression (+11.2% tokens, +20% duration). Answers are identical ✓. The structured plan creation overhead (4 sequential tool calls) outweighs the context reduction benefit in a single-task bench.
- The brick worked correctly end-to-end; the modest regression reflects that structured planning adds scaffolding overhead that pays off qualitatively (dependency graphs, estimates), not token-economically in a single task.

## Auto-detected issues

- Turns > 15 (brick): 18
- Brick slower than native by 20% (UX concern)
- Brick uses MORE tokens than native (708,671 vs 637,112)

## Recommendations

- 📝 Re-measure in Phase 2b multi-task scenario where plans are created once and referenced/updated across multiple tasks — that is where the structured format pays off.
- 📝 For marketing, position as "plan traceability and dependency management" rather than "token savings".
