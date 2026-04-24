# Fiche brick — compress

**Domaine** : Compress text output to save tokens — strip comments, collapse whitespace, abbreviate patterns.
**Prefix** : `cmp`
**Tools** : 3 (`output`, `response`, `terse`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 807,571 | 205,682 | -74.5% |
| cache_creation | 48,012 | 25,499 | |
| cache_read | 752,050 | 175,924 | |
| output | 7,461 | 4,226 | |
| Turns (SDK) | 17 | 7 | |
| Duration (s) | 127.8 | 71.3 | -44% |

## Mini-task (iso)

Using the `compress` brick's `output` tool, apply **aggressive-level** compression to the file `test-repo/packages/common/file-stream/interfaces/streamable-options.interface.ts`. Aggressive compression strips all block comments (`/** … */`) and line comments (`// …`), collapses whitespace (trims leading/trailing spaces on each line), and removes blank lines.

Report **the number of non-empty lines** in the compressed output.

Expected answer format: a single integer.

---

## Tool coverage (brick mode)

- `cmp_output` : called ✓
- `cmp_response` : not called ⚠️
- `cmp_terse` : not called ⚠️

**Coverage score**: 1/3 tools used

## Answers comparison

**Native answer**: 5

**Brick answer**: 5

**Match**: ✓ identical

## Observations

- Strong token savings (Δ=-74.5%) and wall-clock improvement (duration ratio 0.56x). Agent completed the task with 1/3 tools (`cmp_output`). Answers match native ✓ (identical count of 5). The brick provides genuine leverage for text compression tasks.
- The task specifically asked for aggressive-level compression — `cmp_output` is the correct tool. `cmp_response` and `cmp_terse` serve different scenarios (response formatting, terse output) not needed here.

## Auto-detected issues

- Tools not called: `cmp_response`, `cmp_terse`
- Turns > 15 (native): 17

## Recommendations

- 🟢 Keep as-is — `cmp_output` is working as intended.
- 📝 Consider enriching `cmp_response` and `cmp_terse` descriptions to distinguish their use cases from `cmp_output` so agents can select the right tool.
