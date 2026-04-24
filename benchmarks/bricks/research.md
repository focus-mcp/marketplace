# Fiche brick — research

**Domaine** : Multi-source research — collect info from multiple files/sources, synthesize findings, validate consistency.
**Prefix** : `rsh`
**Tools** : 3 (`multisource`, `synthesize`, `validate`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 757,234 | 929,441 | +22.7% ⚠️ |
| cache_creation | 38,035 | 124,874 | |
| cache_read | 711,867 | 776,022 | |
| output | 7,285 | 28,453 | |
| Turns (SDK) | 19 | 15 | |
| Duration (s) | 114.6 | 400.3 | +249% ⚠️ |

## Mini-task (iso)

In the NestJS shallow clone at `test-repo/`, cross-reference two files to identify a consistency gap:

1. **Source A**: `test-repo/packages/common/enums/http-status.enum.ts` — defines the `HttpStatus` enum with all HTTP status code constants.
2. **Source B**: All `.ts` files in `test-repo/packages/common/exceptions/` (excluding `index.ts`, `http.exception.ts`, and `intrinsic.exception.ts`) — each file exports a concrete exception class that references one specific `HttpStatus.*` member.

Your task: determine which `HttpStatus` enum member names whose numeric value falls in the **4xx or 5xx range** are **not referenced** (as `HttpStatus.<MEMBER>`) by any exception class file in `test-repo/packages/common/exceptions/`. List the unused member names sorted alphabetically, one per line.

Expected answer format: a plain list of `HttpStatus` enum member names (just the identifiers, e.g. `EXPECTATION_FAILED`), one per line, sorted alphabetically, covering only codes ≥ 400.

---

## Tool coverage (brick mode)

- `rsh_multisource` : called ✓
- `rsh_synthesize` : called ✓
- `rsh_validate` : called ✓

**Coverage score**: 3/3 tools used

## Answers comparison

**Native answer**: ```
  EXPECTATION_FAILED
  FAILED_DEPENDENCY
  INSUFFICIENT_STORAGE
  LENGTH_REQUIRED
  LOCKED
... (14 total)
```

**Brick answer**: ```
EXPECTATION_FAILED
FAILED_DEPENDENCY
LENGTH_REQUIRED
PAYMENT_REQUIRED
PRECONDITION_REQUIRED
... (9 total)
```

**Match**: divergent (manual check needed)

## Observations

- Meta/orchestration brick (multi-source research). Full 3/3 coverage — all tools used. Regressive: +22.7% tokens, +249% duration. Brick answer is partial: 9 entries vs native's 14 — 5 HttpStatus members were missed.
- The structured multisource → synthesize → validate workflow added significant overhead (400 seconds vs 115 native) without improving answer completeness. The validation step may have introduced false negatives by being overly strict.
- This is a genuine Pattern D case: single-task bench penalizes orchestration overhead. The value proposition is traceability and cross-source consistency, not speed.

## Auto-detected issues

- Turns > 15 (native): 19
- Native notes flagged: error — "`misdirected.exception.ts` contains a copy-paste error in its JSDoc (says `'Bad Gateway'` instead of `'Misdirected'`) but correctly uses `HttpStatus.MISDIRECTED` at runtime — not counted as a consiste"
- Brick slower than native by 249% (UX concern)
- Brick uses MORE tokens than native (929,441 vs 757,234)

## Recommendations

- 🔧 Audit the `rsh_validate` step — it may be filtering out correct entries as "inconsistencies"; loosen the validation threshold.
- 📝 Re-measure in Phase 2b multi-task scenario where multi-source synthesis over many documents rewards the orchestration investment.
- 📝 For marketing, position as "cross-source consistency verification" rather than "token savings".
