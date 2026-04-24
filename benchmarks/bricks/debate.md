# Fiche brick — debate

**Domaine** : Structured multi-perspective debate — define positions, score arguments, find consensus, summarize.
**Prefix** : `dbt`
**Tools** : 4 (`debate`, `consensus`, `score`, `summary`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 303,533 | 246,239 | -18.9% |
| cache_creation | 13,564 | 27,725 | |
| cache_read | 286,504 | 216,409 | |
| output | 3,440 | 2,064 | |
| Turns (SDK) | 9 | 11 | |
| Duration (s) | 59.6 | 67.3 | +13% |

## Mini-task (iso)

Read the file `test-repo/decision-http-adapter.json`. It contains a structured two-option decision between `platform-express` and `platform-fastify` as the HTTP adapter for a NestJS application. The file includes:
- A `criteria` array, each entry with a `name` and integer `weight`.
- A `scores` array, each entry with an `option` label and a `scores` array of raw integers (one per criterion, in the same order as `criteria`).

Using the debate brick's `debate`, `score`, and `summary` tools:
1. Call `debate` with the topic `"Which HTTP adapter should be used for a new NestJS application: platform-express or platform-fastify?"` and two positions derived from each option's pros (joined into a single argument string).
2. Call `score` on the resulting debate, supplying per-role scores that reflect the relative strengths encoded in the JSON: for `platform-express` use relevance=6, evidence=9, feasibility=9; for `platform-fastify` use relevance=9, evidence=6, feasibility=5.
3. Call `summary` on the debate.

Report the following, in this exact format:
```
platform-express weighted total: <integer>
platform-fastify weighted total: <integer>
winner: <option label>
```

The weighted total for each option is computed as: sum over all criteria of (raw_score[i] × weight[i]). The criteria weights from the file are [9, 8, 6, 7] in order. The raw scores for `platform-express` are [6, 9, 9, 9] and for `platform-fastify` are [9, 6, 4, 5].

---

## Tool coverage (brick mode)

- `dbt_debate` : called ✓
- `dbt_consensus` : not called ⚠️
- `dbt_score` : called ✓
- `dbt_summary` : called ✓

**Coverage score**: 3/4 tools used

## Answers comparison

**Native answer**: ```
  platform-express weighted total: 243
  platform-fastify weighted total: 188
  winner: platform-express
  ```
```

**Brick answer**: ```
platform-express weighted total: 243
platform-fastify weighted total: 188
winner: platform-express
```

**Match**: divergent (manual check needed)

## Observations

- Meta/orchestration brick (structured debate). Coverage 3/4 — agent used `debate`, `score`, and `summary` as prescribed. Gain modest (Δ=-18.9% tokens) and slight duration regression (+13%) — single-task bench doesn't reward structured reasoning overhead. Answers are effectively identical (auto-detected as "divergent" due to formatting difference only).
- The brick worked correctly end-to-end; the modest savings reflect that debate workflow naturally requires multiple tool calls with non-trivial output.

## Auto-detected issues

- Tools not called: `dbt_consensus`
- Brick notes flagged: fallback — "All three tools worked as expected. The `score` tool confirmed platform-express as rank 1 (weightedScore ≈ 7.8 vs 6.95) using the debate's internal relevance/evidence/feasibility weighting. The task-s"

## Recommendations

- 📝 Re-measure in Phase 2b multi-task scenario where structured debate reasoning pays off (e.g., recurring architecture decisions with history).
- 📝 For marketing, position as "reasoning traceability" rather than "token savings".
