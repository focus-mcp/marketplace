# Fiche brick — metrics

**Domaine** : Session metrics tracking — token usage, costs, duration, and per-tool statistics.
**Prefix** : `met`
**Tools** : 4 (`session`, `tokens`, `costs`, `duration`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 540,046 | 580,601 | +7.5% ⚠️ |
| cache_creation | 54,330 | 39,349 | |
| cache_read | 480,764 | 533,796 | |
| output | 4,913 | 7,378 | |
| Turns (SDK) | 14 | 18 | |
| Duration (s) | 78.8 | 153.3 | +95% ⚠️ |

## Mini-task (iso)

Using only the TypeScript source files (`.ts` files, excluding `.d.ts` declaration files) inside `test-repo/packages/`, compute the following metrics as a cost-estimation exercise:

1. **File count** — How many `.ts` (non-declaration) files exist under `test-repo/packages/`?
2. **Total lines** — What is the combined line count across all those files?
3. **Estimated input tokens** — Using the rule **1 token ≈ 4 characters**, compute the estimated total input-token count from the total byte size of those files.
4. **Estimated USD cost** — Using the metrics brick's default input price of **$0.003 per 1,000 input tokens**, compute the cost rounded to two decimal places.

Report all four answers as a simple list:
```
File count: <integer>
Total lines: <integer>
Estimated tokens: <integer, floor of chars/4>
Estimated cost (USD): $<X.XX>
```

---

## Tool coverage (brick mode)

- `met_session` : not called ⚠️
- `met_tokens` : not called ⚠️
- `met_costs` : not called ⚠️
- `met_duration` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: ```
  File count: 824
  Total lines: 78,407
  Estimated tokens: 603,321
  Estimated cost (USD): $1.81
  ```
```

**Brick answer**: ```
  File count: N/A
  Total lines: N/A
  Estimated tokens: N/A
  Estimated cost (USD): N/A
  ```
```

**Match**: divergent (manual check needed)

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `met_session`, `met_tokens`, `met_costs`, `met_duration`
- Turns > 15 (brick): 18
- Brick notes flagged: failed — "1. **Brick load failure**: `focus_load("metrics")` failed with `Cannot find module '@focus-mcp/brick-metrics'`. The brick is registered as installed at version `^0.0.0` but the npm module is missing f"
- Brick slower than native by 95% (UX concern)
- Brick uses MORE tokens than native (580,601 vs 540,046)

## Recommendations

_(empty — to be filled after analysis)_
