# Fiche brick — savings

**Domaine** : Track and report token savings — compare FocusMCP usage vs naive full-read, trend over time, ROI.
**Prefix** : `sav`
**Tools** : 4 (`report`, `compare`, `trend`, `roi`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 1,325,113 | 717,459 | -45.9% |
| cache_creation | 90,743 | 116,718 | |
| cache_read | 1,228,852 | 592,335 | |
| output | 5,467 | 8,319 | |
| Turns (SDK) | 20 | 8 | |
| Duration (s) | 133.7 | 244.3 | +83% ⚠️ |

## Mini-task (iso)

Using the NestJS shallow clone at `test-repo/`, estimate the token-savings of a targeted file lookup versus a naive full-read baseline, for the following concrete task:

**Task**: An agent needs to find where the HTTP method decorators `Get`, `Post`, `Put`, `Delete`, and `Patch` are **defined** (not merely used) inside `test-repo/packages/`. Using grep/glob, the agent can identify that all five decorators are defined in exactly one file: `test-repo/packages/common/decorators/http/request-mapping.decorator.ts`.

**Calculation rules** (to make the answer deterministic):
- Count the total number of characters across **all** `.ts` files under `test-repo/packages/` (recursive, excluding nothing). This is the **baseline** character count.
- Count the characters in the single targeted file `test-repo/packages/common/decorators/http/request-mapping.decorator.ts`. This is the **actual** character count.
- Convert both to token estimates using `ceil(chars / 4)` (ceiling integer division by 4).
- Compute **savings %** = `(baselineTokens - actualTokens) / baselineTokens * 100`, rounded to two decimal places.

**Expected answer format** (three values on separate lines):
```
baselineTokens: <integer>
actualTokens: <integer>
savings%: <float>%
```

---

## Tool coverage (brick mode)

- `sav_report` : called ✓
- `sav_compare` : not called ⚠️
- `sav_trend` : not called ⚠️
- `sav_roi` : not called ⚠️

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
  baselineTokens: 603322
  actualTokens: 1268
  savings%: 99.79%
  ```
```

**Brick answer**: ```
  baselineTokens: 603322
  actualTokens: 1268
  savings%: 99.79%
  ```
```

**Match**: ✓ identical

## Observations

- Good token savings (Δ=-45.9%). Agent completed the task with 1/4 tools (`sav_report`). Answers match native ✓ (identical baseline/actual/savings%). Duration regressed (+83%) because the agent had to gather character counts via shell commands first (the brick has no filesystem access), then pass results to `sav_report`.
- The savings brick is a reporting/presentation tool, not a computation tool — it formats pre-computed values. The duration overhead is the file-counting step, not the brick itself.

## Auto-detected issues

- Tools not called: `sav_compare`, `sav_trend`, `sav_roi`
- Turns > 15 (native): 20
- Brick notes flagged: fallback — "- The savings brick tools (`sav_report`, `sav_compare`, `sav_trend`, `sav_roi`) operate on pre-computed token values — they have no filesystem access. To obtain the character counts required as inputs"
- Brick slower than native by 83% (UX concern)

## Recommendations

- 📝 Document clearly that `sav_*` tools are reporting tools for pre-computed values — agents should gather metrics first, then call these tools.
- 📝 Consider adding a `sav_compute` tool that accepts a directory path and computes token estimates internally, removing the need for agent-side file counting.
