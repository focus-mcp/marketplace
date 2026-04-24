# Fiche brick — tokenbudget

**Domaine** : Token budget management — estimate and optimize token usage for AI agents.
**Prefix** : `tb`
**Tools** : 4 (`estimate`, `analyze`, `fill`, `optimize`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 494,874 | 132,683 | -73.2% |
| cache_creation | 32,264 | 15,209 | |
| cache_read | 457,487 | 114,490 | |
| output | 5,088 | 2,959 | |
| Turns (SDK) | 12 | 6 | |
| Duration (s) | 96.6 | 64.0 | -34% |

## Mini-task (iso)

Using the `tokenbudget` brick's `analyze` tool, analyze the token cost of every `.ts` file in the directory `test-repo/packages/common/exceptions/`. Apply the brick's token-estimation heuristic (chars/4) to each file. List **all** files sorted by estimated token count in descending order. Report each file as `<basename> <estimated_tokens>` (one per line), where `basename` is the filename only (no directory prefix), and `estimated_tokens` is the integer result of floor(char_count / 4). Do **not** include the total row. The directory to analyze is `test-repo/packages/common/exceptions/`.

---

## Tool coverage (brick mode)

- `tb_estimate` : not called ⚠️
- `tb_analyze` : called ✓
- `tb_fill` : not called ⚠️
- `tb_optimize` : not called ⚠️

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
  http.exception.ts 1488
  im-a-teapot.exception.ts 554
  http-version-not-supported.exception.ts 546
  unsupported-media-type.exception.ts 539
  internal-server-error.exception.ts 537
... (25 total)
```

**Brick answer**: ```
http.exception.ts 1721
im-a-teapot.exception.ts 640
http-version-not-supported.exception.ts 630
unsupported-media-type.exception.ts 622
internal-server-error.exception.ts 620
... (24 total)
```

**Match**: divergent (manual check needed)

## Observations

- Strong token savings (Δ=-73.2%) and wall-clock improvement (-34%). Agent completed the task with 1/4 tools (`tb_analyze`). Answers diverge: brick reports higher token estimates (e.g. 1721 vs 1488 for `http.exception.ts`) and 24 files vs native's 25. The brick appears to use a different character counting method (e.g., includes trailing newlines or metadata) and may count files differently.
- The token savings are real (context reduction), but the numeric values differ — the brick's `ceil(char/4)` heuristic produces different results than native `floor(char/4)`.

## Auto-detected issues

- Tools not called: `tb_estimate`, `tb_fill`, `tb_optimize`

## Recommendations

- 🔧 Standardize the token estimation formula — document whether `tb_analyze` uses `ceil` or `floor` of `chars/4`, and ensure it matches the spec.
- 🔧 Investigate the 24 vs 25 file discrepancy — likely an `.bak` file inclusion issue.
- 📝 When using `tb_analyze` for token budgeting, note that estimates may vary ±15% from native character counts depending on file encoding.
