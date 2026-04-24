# Fiche brick — refs

**Domaine** : Cross-references — find who imports or uses a symbol, locate declarations, and trace inheritance chains.
**Prefix** : `refs`
**Tools** : 4 (`references`, `implementations`, `declaration`, `hierarchy`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 682,604 | 140,173 | -79.5% |
| cache_creation | 17,394 | 20,526 | |
| cache_read | 661,654 | 117,639 | |
| output | 3,507 | 1,982 | |
| Turns (SDK) | 20 | 6 | |
| Duration (s) | 61.0 | 28.7 | -53% |

## Mini-task (iso)

Using the **refs** brick's `implementations` tool, find all files within `test-repo/packages` that implement the `PipeTransform` interface (defined in `test-repo/packages/common/interfaces/features/pipe-transform.interface.ts`).

Scan only the `test-repo/packages` directory. Return the list of matching file paths, relative to `test-repo/`, sorted alphabetically, one per line. Each path should start with `packages/`.

## Tool coverage (brick mode)

- `refs_references` : not called ⚠️
- `refs_implementations` : called ✓
- `refs_declaration` : not called ⚠️
- `refs_hierarchy` : not called ⚠️

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
packages/common/pipes/default-value.pipe.ts
packages/common/pipes/file/parse-file.pipe.ts
packages/common/pipes/parse-array.pipe.ts
packages/common/pipes/parse-bool.pipe.ts
packages/common/pipes/parse-date.pipe.ts
... (10 total)
```

**Brick answer**: ```
packages/common/pipes/default-value.pipe.ts
packages/common/pipes/file/parse-file.pipe.ts
packages/common/pipes/parse-array.pipe.ts
packages/common/pipes/parse-bool.pipe.ts
packages/common/pipes/parse-date.pipe.ts
... (10 total)
```

**Match**: ✓ identical

## Observations

- Strong token savings (Δ=-79.5%) and wall-clock improvement (duration ratio 0.47x). Agent completed the task with 1/4 tools (`refs_implementations`). Answers match native ✓ (identical 10-file list). The brick provides genuine leverage for interface-implementation discovery.
- `refs_references`, `refs_declaration`, and `refs_hierarchy` cover different use cases (find usages, go-to-definition, inheritance tree) not needed for an implementation scan.

## Auto-detected issues

- Tools not called: `refs_references`, `refs_declaration`, `refs_hierarchy`
- Turns > 15 (native): 20

## Recommendations

- 🟢 Keep as-is — `refs_implementations` is working as intended.
- 📝 Consider enriching sibling tool descriptions so agents reach `refs_hierarchy` for class inheritance tasks and `refs_references` for symbol usage tasks.
