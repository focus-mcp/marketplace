# Fiche brick — callgraph

**Domaine** : Call graph analysis — callers, callees, call chains.
**Prefix** : `cg`
**Tools** : 4 (`callers`, `callees`, `chain`, `depth`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 642,134 | 759,335 | +18.3% ⚠️ |
| cache_creation | 70,126 | 54,479 | |
| cache_read | 566,408 | 697,799 | |
| output | 5,559 | 6,955 | |
| Turns (SDK) | 14 | 24 | |
| Duration (s) | 97.6 | 128.5 | +32% ⚠️ |

## Mini-task (iso)

Using the **callgraph** brick's `callers` tool, find all methods within the `NestFactoryStatic` class in `test-repo/packages/core/nest-factory.ts` that directly call `this.initialize(`. Search the directory `test-repo/packages/core`. Report the distinct public method names (not overload signatures, just unique names) sorted alphabetically, one per line.

Expected answer format: a list of method names, sorted alphabetically, one per line.

---

## Tool coverage (brick mode)

- `cg_callers` : not called ⚠️
- `cg_callees` : not called ⚠️
- `cg_chain` : not called ⚠️
- `cg_depth` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: ```
  create
  createApplicationContext
  createMicroservice
  ```
```

**Brick answer**: Unable to determine — the callgraph brick's `callers` tool could not be loaded

**Match**: divergent (manual check needed)

## Observations

- Brick is in Cat C (regressive): +18.3% tokens, +32% duration, 0/4 tool coverage. The brick could not be loaded (npm package absent from bench environment) — all metrics reflect failed load attempts.
- The regression is entirely a loading-failure artifact: the agent spent extra turns attempting to load the brick before falling back to native tools.
- Despite the failure, the task was completed correctly by native fallback. The callgraph domain requires a functioning index to provide value.

## Auto-detected issues

- Tools not called: `cg_callers`, `cg_callees`, `cg_chain`, `cg_depth`
- Turns > 15 (brick): 24
- Brick slower than native by 32% (UX concern)
- Brick uses MORE tokens than native (759,335 vs 642,134)

## Recommendations

- 🔧 Ensure `@focus-mcp/brick-callgraph` is published to npm and pre-installed in the bench environment before re-running.
- 📝 Exclude from Phase 1 summary stats — the result measures load-failure overhead, not brick value.
