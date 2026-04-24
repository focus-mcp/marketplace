# Fiche brick — callgraph

**Domaine** : Call graph analysis — callers, callees, call chains.
**Prefix** : `cg`
**Tools** : 4 (`callers`, `callees`, `chain`, `depth`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 722,432 | 725,731 | +0.5% ⚠️ |
| cache_creation | 34,201 | 35,222 | |
| cache_read | 683,767 | 684,181 | |
| output | 4,417 | 6,222 | |
| Turns (SDK) | 17 | 25 | |
| Duration (s) | 73.2 | 119.4 | +63% ⚠️ |

## Mini-task (iso)

Using the NestJS shallow clone in `test-repo/packages/core/injector/`, identify all **non-test** method names that directly call `resolveConstructorParams`. Search only `.ts` files within `test-repo/packages/core/` (exclude any file paths containing `/test/`). For each caller, provide the method name and the file path (relative to `test-repo/`), one per line, sorted alphabetically by method name.

Expected answer format:
```
<method_name> (<file_path>)
```

---

## Tool coverage (brick mode)

- `cg_callers` : not called ⚠️
- `cg_callees` : not called ⚠️
- `cg_chain` : not called ⚠️
- `cg_depth` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: ```
  instantiateClass (packages/core/injector/module-ref.ts)
  loadInstance (packages/core/injector/injector.ts)
  ```
```

**Brick answer**: *(unable to determine — brick tools not functional)*

**Match**: divergent (manual check needed)

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `cg_callers`, `cg_callees`, `cg_chain`, `cg_depth`
- Turns > 15 (brick): 25
- Turns > 15 (native): 17
- Brick slower than native by 63% (UX concern)
- Brick uses MORE tokens than native (725,731 vs 722,432)

## Recommendations

_(empty — to be filled after analysis)_
