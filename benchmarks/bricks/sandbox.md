# Fiche brick — sandbox

**Domaine** : Sandboxed code execution — run JavaScript/TypeScript snippets in an isolated VM context.
**Prefix** : `box`
**Tools** : 4 (`run`, `file`, `eval`, `languages`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 524,521 | 744,575 | +42.0% ⚠️ |
| cache_creation | 21,136 | 73,771 | |
| cache_read | 498,980 | 652,298 | |
| output | 4,367 | 18,425 | |
| Turns (SDK) | 14 | 18 | |
| Duration (s) | 68.5 | 283.8 | +314% ⚠️ |

## Mini-task (iso)

In the NestJS repository under `test-repo/`, there is a utility file at `test-repo/packages/common/utils/http-error-by-code.util.ts` that defines a `HttpErrorByCode` record. This record maps HTTP status code enum members (from `test-repo/packages/common/enums/http-status.enum.ts`) to their corresponding exception classes.

Your task: identify every `HttpStatus` enum member used as a key in the `HttpErrorByCode` record, look up its numeric value in the `HttpStatus` enum defined in `test-repo/packages/common/enums/http-status.enum.ts`, then compute and return the **sum of all those numeric values**.

Expected answer format: a single integer (the sum).

---

## Tool coverage (brick mode)

- `box_run` : called ✓
- `box_file` : called ✓
- `box_eval` : not called ⚠️
- `box_languages` : called ✓

**Coverage score**: 3/4 tools used

## Answers comparison

**Native answer**: 8236

**Brick answer**: 8727

**Match**: divergent (manual check needed)

## Observations

- Brick is regressive: +42% tokens, +314% duration. Coverage 3/4 — agent used `box_run`, `box_file`, and `box_languages`. However the answer is wrong (8727 vs correct 8236) because the sandbox cannot execute TypeScript and has no filesystem access.
- Critical limitations: (1) TypeScript is "planned — requires transpilation step" (not yet implemented), (2) no `fs`/`require` access in the sandbox, so the agent had to compute the sum manually inside the sandbox with hardcoded values — introducing a counting error.
- The 314% duration regression reflects the many iterations of failed sandboxed computation attempts.

## Auto-detected issues

- Tools not called: `box_eval`
- Turns > 15 (brick): 18
- Brick notes flagged: limitation, fallback, error — "- **Critical limitation**: The sandbox brick has no TypeScript support (`languages` tool confirms "typescript: planned — requires transpilation step") and no filesystem access (`require`, `fs`, `fetch"
- Native notes flagged: error — "The enum keys and their numeric values were extracted by reading two source files. The 19 status codes that appear as keys in `HttpErrorByCode` are: 400, 401, 403, 404, 405, 406, 408, 409, 410, 412, 4"
- Brick slower than native by 314% (UX concern)
- Brick uses MORE tokens than native (744,575 vs 524,521)

## Recommendations

- 🔧 Implement TypeScript transpilation in the sandbox (`box_run`) — this is required for any TS-based computation task.
- 🔧 Add controlled filesystem access (`box_file` should support reading local paths, not just inline content).
- 📝 Do not market sandbox for TypeScript-specific tasks until TypeScript support is complete.
