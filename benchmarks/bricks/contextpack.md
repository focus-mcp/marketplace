# Fiche brick — contextpack

**Domaine** : Pack files into a compressed context bundle — reduce token usage by extracting only signatures, maps, or full content.
**Prefix** : `cp`
**Tools** : 4 (`pack`, `budget`, `estimate`, `prioritize`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 895,177 | 133,249 | -85.1% |
| cache_creation | 59,670 | 13,562 | |
| cache_read | 826,952 | 118,478 | |
| output | 8,505 | 1,184 | |
| Turns (SDK) | 21 | 6 | |
| Duration (s) | 155.1 | 29.4 | -81% |

## Mini-task (iso)

Using the `contextpack` brick's `pack` tool in `signatures` mode, extract all top-level exported symbols from these three TypeScript files in the NestJS repository:

- `test-repo/packages/common/exceptions/http.exception.ts`
- `test-repo/packages/common/enums/http-status.enum.ts`
- `test-repo/packages/common/pipes/parse-int.pipe.ts`

A "top-level exported symbol" is any TypeScript declaration preceded by `export` at the start of a line with a kind of `class`, `interface`, `enum`, `type`, `function`, or `const` — extract the symbol name only (not the full body).

Return a single flat list of all exported symbol names found across the three files, sorted alphabetically, one name per line. Do not group by file; do not include file paths in the answer list.

---

## Tool coverage (brick mode)

- `cp_pack` : called ✓
- `cp_budget` : not called ⚠️
- `cp_estimate` : not called ⚠️
- `cp_prioritize` : not called ⚠️

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
  DescriptionAndOptions
  HttpException
  HttpExceptionOptions
  HttpStatus
  ParseIntPipe
... (7 total)
```

**Brick answer**: ```
DescriptionAndOptions
HttpException
HttpExceptionOptions
HttpStatus
ParseIntPipe
... (6 total)
```

**Match**: divergent (manual check needed)

## Observations

- Strong token savings (Δ=-85.1%) and excellent wall-clock improvement (duration ratio 0.19x). Agent completed the task with 1/4 tools (`cp_pack`). Answer is partial: brick returned 6 symbols vs native's 7. The savings are real but the brick may have a default limit silently truncating results.
- `cp_pack` in signatures mode is the right tool; the result discrepancy (6 vs 7 symbols) warrants investigation — the missing symbol may indicate a parsing edge case in the pack tool.

## Auto-detected issues

- Tools not called: `cp_budget`, `cp_estimate`, `cp_prioritize`
- Turns > 15 (native): 21
- Brick notes flagged: fallback — "The `cp_pack` tool in `signatures` mode cleanly extracted only the export declarations (class, interface, enum) without bodies. Output was straightforward to parse — each line of the packed output con"

## Recommendations

- 🔧 Audit `cp_pack` signatures mode for edge cases that may drop a symbol (re-export, `export type`, or namespace import).
- 🟢 Token savings are genuine — keep as-is once the missing-symbol edge case is resolved.
- 📝 Consider enriching tool descriptions so agents discover `cp_budget` and `cp_estimate` for token-planning tasks.
