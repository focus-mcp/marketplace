# Fiche brick — convert

**Domaine** : Convert between formats and units — unit conversion, encoding, format transformation, naming conventions.
**Prefix** : `conv`
**Tools** : 4 (`units`, `encoding`, `format`, `language`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 464,685 | 875,667 | +88.4% ⚠️ |
| cache_creation | 19,349 | 78,164 | |
| cache_read | 441,968 | 788,103 | |
| output | 3,333 | 9,287 | |
| Turns (SDK) | 12 | 22 | |
| Duration (s) | 59.1 | 166.9 | +182% ⚠️ |

## Mini-task (iso)

Read the file `test-repo/decision-http-adapter.json`. Extract the value of the top-level `criteria` key, which is a JSON array of objects each having `name` (string) and `weight` (integer) fields. Convert that JSON array to YAML format using the `conv_format` tool (source format: `json`, target format: `yaml`). Report the full YAML output, preserving original key order (`name` before `weight`) and original array order. Expected answer format: a YAML list, each item on its own line with a leading `- `, sub-keys indented by two spaces, no trailing newline shown (exact whitespace as produced by a standard YAML serializer with `default_flow_style=False`).

---

## Tool coverage (brick mode)

- `conv_units` : not called ⚠️
- `conv_encoding` : not called ⚠️
- `conv_format` : not called ⚠️
- `conv_language` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: ```
- name: Raw throughput performance
  weight: 9
- name: Middleware/plugin ecosystem breadth
  weight: 8
- name: Built-in file-upload support (no extra install)
... (8 total)
```

**Brick answer**: ```
- name: Raw throughput performance
  weight: 9
- name: Middleware/plugin ecosystem breadth
  weight: 8
- name: Built-in file-upload support (no extra install)
... (8 total)
```

**Match**: ✓ identical

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `conv_units`, `conv_encoding`, `conv_format`, `conv_language`
- Turns > 15 (brick): 22
- Brick notes flagged: failed — "The `conv_format` brick tool could **not** be invoked. The `convert` brick is registered as installed (`^0.0.0`) but `focus_load` consistently failed with `Cannot find module '@focus-mcp/brick-convert"
- Brick slower than native by 182% (UX concern)
- Brick uses MORE tokens than native (875,667 vs 464,685)

## Recommendations

_(empty — to be filled after analysis)_
