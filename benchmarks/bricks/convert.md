# Fiche brick — convert

**Domaine** : Convert between formats and units — unit conversion, encoding, format transformation, naming conventions.
**Prefix** : `conv`
**Tools** : 4 (`units`, `encoding`, `format`, `language`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 689,805 | 237,875 | -65.5% |
| cache_creation | 29,105 | 26,161 | |
| cache_read | 653,804 | 208,315 | |
| output | 6,849 | 3,366 | |
| Turns (SDK) | 17 | 8 | |
| Duration (s) | 118.6 | 55.8 | -53% |

## Mini-task (iso)

Read the file `test-repo/decision-http-adapter.json`. Extract the `criteria` array, which is a JSON array of objects each with a `"name"` (string) and `"weight"` (integer) key. Using the **convert** brick's `format` tool, convert that JSON array to CSV format. Report the resulting CSV exactly as produced by the tool, including the header row. Expected answer format: multi-line CSV text with a header row followed by one data row per criterion, in the same order they appear in the source file.

---

## Tool coverage (brick mode)

- `conv_units` : not called ⚠️
- `conv_encoding` : not called ⚠️
- `conv_format` : called ✓
- `conv_language` : not called ⚠️

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
  name,weight
  Raw throughput performance,9
  Middleware/plugin ecosystem breadth,8
  Built-in file-upload support (no extra install),6
  Adapter implementation simplicity,7
... (6 total)
```

**Brick answer**: ```
name,weight
Raw throughput performance,9
Middleware/plugin ecosystem breadth,8
Built-in file-upload support (no extra install),6
Adapter implementation simplicity,7
```

**Match**: ✓ same set (order may differ)

## Observations

- Good token savings (Δ=-65.5%) and wall-clock improvement (duration ratio 0.47x). Agent completed the task with 1/4 tools (`conv_format`). Answer matches native ✓. The brick provides genuine leverage for format conversion tasks.
- The first call to `conv_format` failed with a runtime bug (`val.includes is not a function` in CSV serializer), but a retry succeeded — the final result is correct.

## Auto-detected issues

- Tools not called: `conv_units`, `conv_encoding`, `conv_language`
- Turns > 15 (native): 17
- Brick notes flagged: bug, failed, error — "The first call to `mcp__focus__conv_format` failed with `val.includes is not a function` — this is a bug in the brick's CSV serializer: it calls `.includes()` on each field value to check for quoting "

## Recommendations

- 🔧 Fix the CSV serializer bug in `conv_format` — input arrays need to be coerced to strings before `.includes()` is called.
- 🟢 Once the bug is fixed, savings and correctness are solid for format conversion tasks.
