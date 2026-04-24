# Fiche brick — fileread

**Domaine** : Read files — full, head, tail, line range, encoding detection.
**Prefix** : `fr`
**Tools** : 4 (`read`, `head`, `tail`, `range`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 390,912 | 120,309 | -69.2% |
| cache_creation | 30,673 | 12,844 | |
| cache_read | 355,912 | 106,434 | |
| output | 4,298 | 1,007 | |
| Turns (SDK) | 10 | 6 | |
| Duration (s) | 78.6 | 19.2 | -76% |

## Mini-task (iso)

Open the file `test-repo/packages/core/injector/container.ts`. Read **lines 339 through 345** of that file (using a line-range read operation). Within those lines, identify and report the exact text of the single `return` statement found in the implementation body of `getDynamicMetadataByToken`. Strip any leading and trailing whitespace from the line before reporting. The expected answer format is a single line of TypeScript code.

---

## Tool coverage (brick mode)

- `fr_read` : not called ⚠️
- `fr_head` : not called ⚠️
- `fr_tail` : not called ⚠️
- `fr_range` : called ✓

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: `return metadataKey ? (metadata?.[metadataKey] ?? []) : metadata;`

**Brick answer**: `return metadataKey ? (metadata?.[metadataKey] ?? []) : metadata;`

**Match**: ✓ identical

## Observations

- Strong token savings (Δ=-69.2%) and excellent wall-clock improvement (duration ratio 0.24x). Agent completed the task with 1/4 tools (`fr_range`). Answers match native ✓ (identical return statement). The brick provides genuine leverage for targeted line-range reading.
- The task explicitly requested lines 339–345 — `fr_range` is the exact right tool. `fr_read`, `fr_head`, and `fr_tail` serve different scenarios not needed here.

## Auto-detected issues

- Tools not called: `fr_read`, `fr_head`, `fr_tail`

## Recommendations

- 🟢 Keep as-is — `fr_range` delivers strong savings for targeted line-range reads.
- 📝 Consider enriching sibling tool descriptions so agents use `fr_summary` for high-level reads and `fr_range` for pinpoint reads.
