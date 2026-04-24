# Fiche brick — graphbuild

**Domaine** : Knowledge graph builder — construct a graph of code entities (files, functions, types) and their relationships.
**Prefix** : `gb`
**Tools** : 5 (`build`, `update`, `watch`, `add`, `multimodal`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 548,473 | 486,636 | -11.3% |
| cache_creation | 30,649 | 49,195 | |
| cache_read | 514,040 | 432,382 | |
| output | 3,747 | 4,994 | |
| Turns (SDK) | 14 | 9 | |
| Duration (s) | 77.5 | 164.8 | +113% ⚠️ |

## Mini-task (iso)

Examine the file `test-repo/packages/core/nest-factory.ts` and list every **direct relative import specifier** it contains — i.e., every module path in an `import … from '…'` statement that starts with `./` or `../`. Report only the module specifier strings (not the imported symbols, not the surrounding quotes), one per line, sorted alphabetically. Do not include imports from `@nestjs/…` or any other non-relative paths.

## Tool coverage (brick mode)

- `gb_build` : called ✓
- `gb_update` : not called ⚠️
- `gb_watch` : not called ⚠️
- `gb_add` : not called ⚠️
- `gb_multimodal` : called ✓

**Coverage score**: 2/5 tools used

## Answers comparison

**Native answer**: ```
./adapters/http-adapter
./application-config
./constants
./errors/exceptions-zone
./helpers/load-adapter
... (16 total)
```

**Brick answer**: ```
./adapters/http-adapter
./application-config
./constants
./errors/exceptions-zone
./helpers/load-adapter
... (16 total)
```

**Match**: ✓ identical

## Observations

- Modest token savings (Δ=-11.3%) but significant duration regression (+113%). Coverage 2/5 — agent used `gb_build` and `gb_multimodal`. Answers match native ✓ (identical 16-path list).
- The duration regression (+113%) suggests the `gb_build` + `gb_multimodal` call sequence adds substantial overhead vs a direct file read. The small token savings don't compensate for the time cost.
- The graph construction overhead is a one-time cost in multi-task scenarios; in single-task bench it appears regressive.

## Auto-detected issues

- Tools not called: `gb_update`, `gb_watch`, `gb_add`
- Brick slower than native by 113% (UX concern)

## Recommendations

- 📝 Re-measure in Phase 2b where the graph is built once and queried multiple times — the amortized cost should be much lower.
- 📝 For marketing, position as "persistent code intelligence" rather than "single-query savings".
