# Fiche brick — thinking

**Domaine** : Structured reasoning chains — think step by step, branch alternatives, revise conclusions, summarize.
**Prefix** : `thk`
**Tools** : 4 (`think`, `branch`, `revise`, `summarize`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 272,794 | 318,940 | +16.9% ⚠️ |
| cache_creation | 9,581 | 33,475 | |
| cache_read | 260,638 | 279,776 | |
| output | 2,552 | 5,646 | |
| Turns (SDK) | 8 | 11 | |
| Duration (s) | 51.3 | 110.2 | +115% ⚠️ |

## Mini-task (iso)

Read the decision record at `test-repo/decision-http-adapter.json`. It contains two options (`platform-express`, `platform-fastify`), a list of weighted criteria (each with a `weight` field), and per-option `scores` arrays (aligned with the criteria list). Compute the weighted total score for each option by multiplying each criterion's `weight` by the corresponding option score and summing all products. Then determine whether the `chosen` field in the file names the option with the highest weighted total.

Report three values:
1. Weighted total for `platform-express`
2. Weighted total for `platform-fastify`
3. Is the `chosen` field mathematically correct? (`yes` or `no`)

Expected answer format — three lines exactly:
```
platform-express: <integer>
platform-fastify: <integer>
chosen correct: yes|no
```

## Tool coverage (brick mode)

- `thk_think` : called ✓
- `thk_branch` : not called ⚠️
- `thk_revise` : not called ⚠️
- `thk_summarize` : called ✓

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: ```
  platform-express: 243
  platform-fastify: 188
  chosen correct: yes
  ```
```

**Brick answer**: ```
platform-express: 243
platform-fastify: 188
chosen correct: yes
```

**Match**: divergent (manual check needed)

## Observations

- Meta/orchestration brick (structured reasoning). Coverage 2/4 — agent used `thk_think` and `thk_summarize`. Small regression (+16.9% tokens, +115% duration). Answers are identical ✓.
- The structured thinking overhead (think → summarize cycle) doubles the duration vs direct computation. For a deterministic weighted-sum calculation, structured reasoning adds no accuracy benefit.
- `thk_branch` and `thk_revise` are for exploring alternatives and revising conclusions — not needed for a deterministic computation task.

## Auto-detected issues

- Tools not called: `thk_branch`, `thk_revise`
- Brick slower than native by 115% (UX concern)
- Brick uses MORE tokens than native (318,940 vs 272,794)

## Recommendations

- 📝 Re-measure in Phase 2b with ambiguous multi-hypothesis tasks where `thk_branch` and `thk_revise` provide reasoning traceability value.
- 📝 For marketing, position as "structured reasoning for complex decisions" rather than "token savings for computation tasks".
