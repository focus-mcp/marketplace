# Fiche brick — symbol

**Domaine** : Symbol lookup in source files — find, get, bulk, body.
**Prefix** : `sym`
**Tools** : 4 (`find`, `get`, `bulk`, `body`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 573,213 | 562,368 | -1.9% |
| cache_creation | 17,684 | 50,545 | |
| cache_read | 551,880 | 505,878 | |
| output | 3,608 | 5,861 | |
| Turns (SDK) | 16 | 18 | |
| Duration (s) | 72.0 | 108.4 | +51% ⚠️ |

## Mini-task (iso)

**Task**: Using the `test-repo/packages/core/scanner.ts` file, identify all public methods of the `DependenciesScanner` class (the only exported class in that file). Report the method names sorted alphabetically, one per line. Do not include private, protected, or constructor entries — only methods declared with the `public` keyword. The `async` modifier does not affect whether a method is public; include async public methods as well.

**Expected answer format**: A sorted alphabetical list of method names, one per line (26 entries total). Do not include parentheses, parameters, return types, or any other text — just the bare method name.

---

## Tool coverage (brick mode)

- `sym_find` : not called ⚠️
- `sym_get` : not called ⚠️
- `sym_bulk` : not called ⚠️
- `sym_body` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: ```
addScopedEnhancersMetadata
applyApplicationProviders
calculateModulesDistance
getApplyProvidersMap
getApplyRequestProvidersMap
... (26 total)
```

**Brick answer**: *(unavailable — brick tools failed to load; see Notes)*

**Match**: divergent (manual check needed)

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `sym_find`, `sym_get`, `sym_bulk`, `sym_body`
- Turns > 15 (brick): 18
- Turns > 15 (native): 16
- Brick slower than native by 51% (UX concern)

## Recommendations

_(empty — to be filled after analysis)_
