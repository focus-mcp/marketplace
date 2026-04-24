# Fiche brick — repos

**Domaine** : Multi-repo management — register, track, and get stats for multiple repositories.
**Prefix** : `repos`
**Tools** : 4 (`list`, `register`, `unregister`, `stats`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 470,866 | 138,842 | -70.5% |
| cache_creation | 14,524 | 12,636 | |
| cache_read | 453,099 | 125,026 | |
| output | 3,208 | 1,154 | |
| Turns (SDK) | 14 | 7 | |
| Duration (s) | 53.4 | 29.8 | -44% |

## Mini-task (iso)

Using the **repos** FocusMCP brick (tools: `register`, `stats`), register the directory `test-repo/packages/common` under the name `"common"` and then retrieve its statistics.

Report the two numbers returned by `stats`:
1. The **total number of files** in `test-repo/packages/common` (all file types, recursively).
2. The **total number of lines** across all those files (recursively).

Expected answer format: two integers, one per line, labeled:
```
files: <N>
lines: <N>
```

The task is limited to registering exactly one repo (`common` → `test-repo/packages/common`) and calling `stats("common")`.

---

## Tool coverage (brick mode)

- `repos_list` : not called ⚠️
- `repos_register` : called ✓
- `repos_unregister` : not called ⚠️
- `repos_stats` : called ✓

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: ```
  files: 269
  lines: 17864
  ```
```

**Brick answer**: ```
  files: 269
  lines: 18133
  ```
```

**Match**: divergent (manual check needed)

## Observations

- Good token savings (Δ=-70.5%) and wall-clock improvement (-44%). Coverage 2/4 — agent used `repos_register` and `repos_stats` as prescribed. Answers diverge on line count: brick reports 18,133 lines vs native's 17,864 — a ~269-line discrepancy.
- The brick answer is partial: line count differs from native (possibly `.bak` and `.bak2` files included in brick count but excluded by native). The file count matches exactly (269 files).
- `repos_list` and `repos_unregister` are lifecycle operations not needed for a register+stats task.

## Auto-detected issues

- Tools not called: `repos_list`, `repos_unregister`
- Brick notes flagged: error — "Both tools worked as expected with no errors. The `stats` result also returned a language breakdown (`.md`, `.ts`, `.bak`, `.bak2`, `.json`), but the task only requested total files and lines."

## Recommendations

- 🔧 Audit `repos_stats` line counting — ensure it excludes `.bak`/`.bak2` backup files consistent with native `wc -l` behavior, or document what file types are included.
- 🟢 Token savings and register+stats flow work correctly — keep as-is once the line-count discrepancy is resolved.
