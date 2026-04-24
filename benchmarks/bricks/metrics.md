# Fiche brick — metrics

**Domaine** : Session metrics tracking — token usage, costs, duration, and per-tool statistics.
**Prefix** : `met`
**Tools** : 4 (`session`, `tokens`, `costs`, `duration`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 505,080 | 1,023,424 | +102.6% ⚠️ |
| cache_creation | 22,783 | 151,710 | |
| cache_read | 477,793 | 847,204 | |
| output | 4,468 | 24,448 | |
| Turns (SDK) | 13 | 13 | |
| Duration (s) | 79.4 | 481.4 | +506% ⚠️ |

## Mini-task (iso)

Using the **metrics** MCP brick (tools: `session`, `tokens`, `costs`, `duration`), simulate tracking a short coding session over three source files in `test-repo/packages/core/`:

1. `application-config.ts`
2. `constants.ts`
3. `adapters/http-adapter.ts`

For each file, compute the approximate input token count as **`ceil(byte_count / 4)`** (byte count = file size in bytes as reported by `wc -c`; no output tokens). Record each file as a separate `tokens` tool call with `tool` set to `"Read"`.

After recording all three, call the `costs` tool with **default pricing** (`inputPricePer1k = 0.003`, `outputPricePer1k = 0.015`).

Report two values:
- **Total input tokens** (integer): sum of all three per-file token counts
- **Estimated input cost** (USD, 6 decimal places): total_input_tokens / 1000 × 0.003

Expected answer format:
```
Total input tokens: <integer>
Estimated input cost: $<value with 6 decimal places>
```

---

## Tool coverage (brick mode)

- `met_session` : not called ⚠️
- `met_tokens` : called ✓
- `met_costs` : called ✓
- `met_duration` : not called ⚠️

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: ```
  Total input tokens: 2801
  Estimated input cost: $0.008403
  ```
  Per-file breakdown: `application-config.ts` → 1081 tokens (4324 bytes), `constants.ts` → 231 tokens (922 bytes), `adapters/http-adapter.ts` → 1489 tokens (5955 bytes)
```

**Brick answer**: ```
  Total input tokens: 2801
  Estimated input cost: $0.008403
  ```
```

**Match**: divergent (manual check needed)

## Observations

- Brick is severely regressive: +102.6% tokens, +506% duration. Coverage 2/4 — agent used `met_tokens` and `met_costs`. The answer is numerically correct ✓ (identical totals), but the overhead is extreme (481 seconds vs 79 seconds native).
- The duration regression (+506%) suggests the metrics tracking instruments added very high per-turn logging overhead, or the brick's internal state management created contention during 13 turns.
- Output tokens exploded (24,448 vs 4,468 native) — the brick likely emits verbose internal state in each response.

## Auto-detected issues

- Tools not called: `met_session`, `met_duration`
- Brick slower than native by 506% (UX concern)
- Brick uses MORE tokens than native (1,023,424 vs 505,080)

## Recommendations

- 🔧 Audit `met_tokens` and `met_costs` for verbose response payloads — trim internal state from tool output to reduce output tokens per call.
- 🔧 Profile the 506% duration regression to identify whether it's output size or I/O overhead.
- 📝 Exclude from Phase 1 summary stats — this is a performance bug, not a metrics-domain limitation.
