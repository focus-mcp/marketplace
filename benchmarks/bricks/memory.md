# Fiche brick — memory

**Domaine** : Persistent key-value memory — store and recall information across sessions as JSON files.
**Prefix** : `mem`
**Tools** : 5 (`store`, `recall`, `search`, `forget`, `list`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 648,639 | 791,125 | +22.0% ⚠️ |
| cache_creation | 21,970 | 118,583 | |
| cache_read | 621,172 | 661,564 | |
| output | 5,452 | 10,877 | |
| Turns (SDK) | 17 | 29 | |
| Duration (s) | 88.4 | 185.8 | +110% ⚠️ |

## Mini-task (iso)

In the NestJS repository at `test-repo/packages/common/exceptions/`, there are TypeScript files defining concrete HTTP exception classes. Each file (excluding `http.exception.ts`, `intrinsic.exception.ts`, and `index.ts`) defines exactly one class that extends `HttpException` and uses exactly one `HttpStatus.<CONSTANT>` value.

Your task:
1. For each such `.ts` file, read the exported class name and the first `HttpStatus.<CONSTANT>` used in it.
2. Use `mem__store` to store each entry with key = the `HttpStatus` constant name (e.g., `BAD_REQUEST`), value = the exception class name (e.g., `BadRequestException`), and tags = `["http-exception"]`.
3. After storing all entries, call `mem__list` with tag `"http-exception"`.
4. Report the resulting list of keys, sorted alphabetically, one per line.

Expected answer format: 21 keys, one per line, sorted alphabetically (A–Z).

---

## Tool coverage (brick mode)

- `mem_store` : called ✓
- `mem_recall` : not called ⚠️
- `mem_search` : not called ⚠️
- `mem_forget` : not called ⚠️
- `mem_list` : called ✓

**Coverage score**: 2/5 tools used

## Answers comparison

**Native answer**: ```
BAD_GATEWAY
BAD_REQUEST
CONFLICT
FORBIDDEN
GATEWAY_TIMEOUT
... (21 total)
```

**Brick answer**: ```
BAD_GATEWAY
BAD_REQUEST
CONFLICT
FORBIDDEN
GATEWAY_TIMEOUT
... (21 total)
```

**Match**: ✓ identical

## Observations

- Stateful brick — designed for persistent key-value memory across sessions. Single-task iso-bench cannot exercise cross-session recall, so gains/losses here are not representative.
- The brick is regressive in single-task: +22% tokens, +110% duration, 29 turns. The agent had to read source files to populate the memory store, but no file-reading brick was co-loaded — requiring extra workaround turns. The answer is correct ✓ (identical 21 keys).
- The overhead is a tool-dependency gap: `memory` brick alone cannot enumerate files; it needs `fileread` or `filesearch` co-loaded.

## Auto-detected issues

- Tools not called: `mem_recall`, `mem_search`, `mem_forget`
- Turns > 15 (brick): 29
- Turns > 15 (native): 17
- Brick notes flagged: error — "The focus MCP has no native file-reading brick (focus_search returned no results for "filesystem file read"; only the `memory` brick was loaded). To gather file content while obeying the prohibition o"
- Native notes flagged: error — "`http.exception.ts` contains `HttpStatus.BAD_REQUEST` only in JSDoc comment examples (not as the class's own status), so it must be explicitly excluded. `intrinsic.exception.ts` defines `IntrinsicExce"
- Brick slower than native by 110% (UX concern)
- Brick uses MORE tokens than native (791,125 vs 648,639)

## Recommendations

- 🔧 Re-bench with `memory` + `fileread` co-loaded to remove the file-reading gap from the measurement.
- 🔧 Re-bench in Phase 2b multi-task scenario where memory is stored once and recalled across tasks — that is the real value proposition.
- 📝 Do not use single-task numbers for marketing on this brick.
