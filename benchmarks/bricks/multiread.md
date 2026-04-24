# Fiche brick — multiread

**Domaine** : Batch file reading — multiple files in one call, deduplication.
**Prefix** : `mr`
**Tools** : 3 (`batch`, `dedup`, `merge`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 528,712 | 192,108 | -63.7% |
| cache_creation | 29,991 | 56,211 | |
| cache_read | 493,930 | 132,542 | |
| output | 4,755 | 3,326 | |
| Turns (SDK) | 14 | 6 | |
| Duration (s) | 84.5 | 49.3 | -42% |

## Mini-task (iso)

In the NestJS monorepo at `test-repo/packages/common/exceptions/`, there are several TypeScript files each defining a concrete HTTP exception class. Each class has a constructor with a `descriptionOrOptions` parameter whose default value is the human-readable error description string.

Read **all `.ts` files** in `test-repo/packages/common/exceptions/` **except** `index.ts`, `http.exception.ts`, and `intrinsic.exception.ts`. For each file, identify the exception class name and the default string value of the `descriptionOrOptions` constructor parameter.

Output exactly 21 lines, one per exception class, sorted alphabetically by class name, in the format:

```
ClassName: "default description"
```

(Use straight double-quotes around the description, even if the original source uses single-quotes or backticks.)

## Tool coverage (brick mode)

- `mr_batch` : not called ⚠️
- `mr_dedup` : not called ⚠️
- `mr_merge` : called ✓

**Coverage score**: 1/3 tools used

## Answers comparison

**Native answer**: ```
BadGatewayException: "Bad Gateway"
BadRequestException: "Bad Request"
ConflictException: "Conflict"
ForbiddenException: "Forbidden"
GatewayTimeoutException: "Gateway Timeout"
... (21 total)
```

**Brick answer**: ```
BadGatewayException: "Bad Gateway"
BadRequestException: "Bad Request"
ConflictException: "Conflict"
ForbiddenException: "Forbidden"
GatewayTimeoutException: "Gateway Timeout"
... (21 total)
```

**Match**: ✓ identical

## Observations

- Good token savings (Δ=-63.7%) and wall-clock improvement (-42%). Agent completed the task with 1/3 tools (`mr_merge`). Answers match native ✓ (identical 21 exception classes). The brick provides genuine leverage for batch file reading tasks.
- The agent used `mr_merge` rather than `mr_batch` — the merge tool was appropriate for combining results across multiple file reads. `mr_dedup` is not needed when files have non-overlapping content.
- Native notes confirm the `mr_batch` tool would collapse 6+ sequential file-read calls into one invocation — this efficiency wasn't measured here since `mr_merge` was used instead.

## Auto-detected issues

- Tools not called: `mr_batch`, `mr_dedup`
- Native notes flagged: error — "The `multiread` brick's `batch` tool would collapse the 6+ sequential file-read Bash calls into a single invocation, which is exactly the efficiency gain it's designed to provide. Files with multi-lin"

## Recommendations

- 🟢 Keep as-is — `mr_merge` is working correctly for multi-file combination tasks.
- 📝 Consider enriching `mr_batch` description to clarify it's for parallel batch reads vs `mr_merge` which combines results after separate reads.
