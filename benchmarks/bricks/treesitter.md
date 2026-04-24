# Fiche brick — treesitter

**Domaine** : Regex-based code indexer for TypeScript/JavaScript — parses symbols, imports, exports.
**Prefix** : `ts`
**Tools** : 5 (`index`, `reindex`, `status`, `cleanup`, `langs`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 582,781 | 505,838 | -13.2% |
| cache_creation | 28,898 | 27,602 | |
| cache_read | 550,036 | 472,827 | |
| output | 3,805 | 5,325 | |
| Turns (SDK) | 19 | 19 | |
| Duration (s) | 52.5 | 112.0 | +113% ⚠️ |

## Mini-task (iso)

Using the treesitter brick, index the directory `test-repo/packages/common/enums/` and identify every TypeScript `enum` symbol that is exported (i.e. declared with `export enum`). Return the enum names sorted alphabetically, one per line. Only include enum names as declared in `.ts` files directly inside that directory (not transitive re-exports via barrel `index.ts`). Expected format is a plain alphabetically-sorted list of identifier names, one per line.

## Tool coverage (brick mode)

- `ts_index` : not called ⚠️
- `ts_reindex` : not called ⚠️
- `ts_status` : not called ⚠️
- `ts_cleanup` : not called ⚠️
- `ts_langs` : not called ⚠️

**Coverage score**: 0/5 tools used

## Answers comparison

**Native answer**: ```
  HttpStatus
  RequestMethod
  RouteParamtypes
  ShutdownSignal
  VersioningType
... (6 total)
```

**Brick answer**: *(unavailable — brick failed to load; ts_index tool was never registered)*

**Match**: divergent (manual check needed)

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `ts_index`, `ts_reindex`, `ts_status`, `ts_cleanup`, `ts_langs`
- Turns > 15 (brick): 19
- Turns > 15 (native): 19
- Brick notes flagged: fallback — "The treesitter brick is registered as installed (version `^0.0.0`) but `focus_load` fails with `Cannot find module '@focus-mcp/brick-treesitter'`. The brick stub at `.focus/bricks/noop.js` references "
- Brick slower than native by 113% (UX concern)

## Recommendations

_(empty — to be filled after analysis)_
