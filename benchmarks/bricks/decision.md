# Fiche brick — decision

**Domaine** : Structured decision-making — define options, analyze tradeoffs, recommend, and record decisions.
**Prefix** : `dec`
**Tools** : 4 (`options`, `tradeoffs`, `recommend`, `record`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 459,840 | 365,827 | -20.4% |
| cache_creation | 18,802 | 38,478 | |
| cache_read | 436,644 | 321,671 | |
| output | 4,360 | 5,623 | |
| Turns (SDK) | 12 | 9 | |
| Duration (s) | 100.6 | 98.7 | -2% |

## Mini-task (iso)

The file `test-repo/decision-http-adapter.json` contains a structured decision record for choosing between two NestJS HTTP adapters. It includes an `options` array (with labels, pros, and cons), a `criteria` array (each criterion has a `name` and a `weight` from 1–10), and a `scores` array (each entry has an `option` label and a `scores` array of numeric scores, one per criterion in the same order).

**Task**: Read `test-repo/decision-http-adapter.json`. For each option, compute its total weighted score as the dot product of the criteria weights vector and the option's scores vector (i.e., `sum(weight[i] * score[i])` for all criteria `i`). Report the weighted score for each option and identify the winning option (highest total weighted score).

**Expected answer format**: Two lines, one per option, formatted as `<option-label>: <total-weighted-score>`, sorted by descending score, followed by a third line: `Winner: <winning-option-label>`.

---

## Tool coverage (brick mode)

- `dec_options` : called ✓
- `dec_tradeoffs` : called ✓
- `dec_recommend` : called ✓
- `dec_record` : not called ⚠️

**Coverage score**: 3/4 tools used

## Answers comparison

**Native answer**: ```
  platform-express: 243
  platform-fastify: 188
  Winner: platform-express
  ```
```

**Brick answer**: ```
  platform-express: 243
  platform-fastify: 188
  Winner: platform-express
  ```
```

**Match**: ✓ identical

## Observations

- Meta/orchestration brick (structured decision). Coverage 3/4 — agent used `options`, `tradeoffs`, and `recommend` as prescribed. Gain modest (Δ=-20.4% tokens, -2% duration) — single-task bench doesn't reward decision-structuring overhead. Answers are identical ✓.
- The brick worked correctly end-to-end. The modest savings are expected: structured decision workflows add reasoning scaffolding that pays off in qualitative clarity, not token economy.

## Auto-detected issues

- Tools not called: `dec_record`

## Recommendations

- 📝 Re-measure in Phase 2b multi-task scenario where decisions are made, recorded, and recalled — that's where `dec_record` provides compounding value.
- 📝 For marketing, position as "decision traceability and auditability" rather than "token savings".
