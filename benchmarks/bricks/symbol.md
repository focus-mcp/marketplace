# Fiche brick — symbol

**Domaine** : Symbol lookup in source files — find, get, bulk, body.
**Prefix** : `sym`
**Tools** : 4 (`find`, `get`, `bulk`, `body`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 628,115 | 603,717 | -3.9% |
| cache_creation | 22,507 | 32,881 | |
| cache_read | 601,347 | 564,126 | |
| output | 4,217 | 6,628 | |
| Turns (SDK) | 16 | 22 | |
| Duration (s) | 95.2 | 128.6 | +35% ⚠️ |

## Mini-task (iso)

In the NestJS test repository, find all **public method names** defined in the `Injector` class located at `test-repo/packages/core/injector/injector.ts`. Report the method names as a sorted alphabetical list, one name per line. Do not include access modifier keywords (`public`, `async`), return types, generic type parameters, or parameters — only the bare method name. Constructors and private/protected members should not be included.

---

## Tool coverage (brick mode)

- `sym_find` : not called ⚠️
- `sym_get` : not called ⚠️
- `sym_bulk` : not called ⚠️
- `sym_body` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: ```
applyProperties
applySettlementSignal
getClassDependencies
getFactoryProviderDependencies
instantiateClass
... (28 total)
```

**Brick answer**: *(unavailable — see Notes)*

**Match**: divergent (manual check needed)

## Observations

- Brick is near-neutral with slight regression: -3.9% tokens (minimal savings), +35% duration, 0/4 coverage. The `symbol` brick could not be loaded (`@focus-mcp/brick-symbol` npm package absent) — all overhead is from failed load attempts (22 turns vs 16 native).
- Three distinct failure modes were encountered across brick loading, indicating a systemic env issue in this bench run. Despite the failure, the agent completed the task via native fallback (brick answer unavailable).
- The near-zero savings (-3.9%) suggests the native agent also struggled with this task (16 turns, large output), so the reduced context provided minimal benefit.

## Auto-detected issues

- Tools not called: `sym_find`, `sym_get`, `sym_bulk`, `sym_body`
- Turns > 15 (brick): 22
- Turns > 15 (native): 16
- Brick notes flagged: failed — "The `symbol` brick could not be loaded. Three distinct failure modes were encountered across all installed bricks:
  1. **`symbol`** — `Cannot find module '@focus-mcp/brick-symbol'` (npm package not p"
- Brick slower than native by 35% (UX concern)

## Recommendations

- 🔧 Ensure `@focus-mcp/brick-symbol` is published to npm and pre-installed in bench environment.
- 📝 Exclude from Phase 1 summary stats — result measures load-failure overhead, not symbol-lookup performance.
