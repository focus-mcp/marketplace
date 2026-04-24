# Fiche brick — smartread

**Domaine** : Intelligent file reading — multiple modes to minimize token usage.
**Prefix** : `sr`
**Tools** : 5 (`full`, `map`, `signatures`, `imports`, `summary`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 672,705 | 275,094 | -59.1% |
| cache_creation | 52,057 | 37,636 | |
| cache_read | 609,743 | 234,935 | |
| output | 10,866 | 2,473 | |
| Turns (SDK) | 14 | 10 | |
| Duration (s) | 141.2 | 48.7 | -66% |

## Mini-task (iso)

Using the `smartread` brick's **`map`** or **`signatures`** tool, identify all **public methods** (non-constructor) declared in the `RouterExplorer` class in `test-repo/packages/core/router/router-explorer.ts`. List the method names only (not their signatures or return types), sorted alphabetically, one per line. Do not include private methods or the constructor.

Expected answer format: a plain list of method names, one per line, sorted alphabetically (e.g. `applyPathsToRouterProxy\ncreateRequestScopedHandler\nexplore\nextractRouterPath`).

---

## Tool coverage (brick mode)

- `sr_full` : called ✓
- `sr_map` : called ✓
- `sr_signatures` : called ✓
- `sr_imports` : not called ⚠️
- `sr_summary` : called ✓

**Coverage score**: 4/5 tools used

## Answers comparison

**Native answer**: ```
  applyPathsToRouterProxy
  createRequestScopedHandler
  explore
  extractRouterPath
  ```
```

**Brick answer**: ```
applyPathsToRouterProxy
createRequestScopedHandler
explore
extractRouterPath
```

**Match**: divergent (manual check needed)

## Observations

- Good token savings (Δ=-59.1%) and excellent wall-clock improvement (duration ratio 0.34x). High coverage 4/5 — agent used `sr_full`, `sr_map`, `sr_signatures`, and `sr_summary`. Answers match native ✓ (identical 4 public methods). The brick provides genuine leverage for intelligent file reading with multiple read modes.
- `sr_imports` was not called because the task focused on method discovery, not import analysis — this is expected.

## Auto-detected issues

- Tools not called: `sr_imports`

## Recommendations

- 🟢 Keep as-is — smartread is working as intended with strong multi-mode coverage.
- 📝 Consider enriching `sr_imports` description to clarify it's for dependency analysis, distinct from the structure/signature modes.
