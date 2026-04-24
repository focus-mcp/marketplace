# Fiche brick — cache

**Domaine** : In-memory file cache — avoid redundant disk reads with mtime-based invalidation.
**Prefix** : `cache`
**Tools** : 5 (`get`, `set`, `invalidate`, `warmup`, `stats`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 478,394 | 429,392 | -10.2% |
| cache_creation | 25,578 | 42,877 | |
| cache_read | 448,594 | 382,295 | |
| output | 4,188 | 4,144 | |
| Turns (SDK) | 12 | 16 | |
| Duration (s) | 67.5 | 104.8 | +55% ⚠️ |

## Mini-task (iso)

You are working with the NestJS monorepo shallow clone located at `test-repo/`. Your task is:

**Find every TypeScript source file under `test-repo/packages/common/` that contains at least one `export class` declaration. Exclude test files (`*.spec.ts`) and declaration files (`*.d.ts`). List the matching file paths relative to `test-repo/` (i.e., starting with `packages/common/…`), one per line, sorted alphabetically.**

In brick mode you should use the `cache` brick: call `warmup` to pre-load all eligible `.ts` files from `test-repo/packages/common/` into the in-memory cache, then call `get` on each file path to retrieve its content from cache (avoiding redundant disk reads), and filter to those whose content contains the string `export class`. Report the file paths relative to `test-repo/`, sorted alphabetically.

Expected answer format: a plain list of file paths, one per line, sorted alphabetically (e.g., `packages/common/exceptions/bad-gateway.exception.ts` on the first line, etc.). There are 44 matching files total.

---

## Tool coverage (brick mode)

- `cache_get` : not called ⚠️
- `cache_set` : not called ⚠️
- `cache_invalidate` : not called ⚠️
- `cache_warmup` : not called ⚠️
- `cache_stats` : not called ⚠️

**Coverage score**: 0/5 tools used

## Answers comparison

**Native answer**: ```
packages/common/exceptions/bad-gateway.exception.ts
packages/common/exceptions/bad-request.exception.ts
packages/common/exceptions/conflict.exception.ts
packages/common/exceptions/forbidden.exception.ts
packages/common/exceptions/gateway-timeout.exception.ts
... (44 total)
```

**Brick answer**: UNAVAILABLE — the cache brick could not be loaded (`Cannot find module '@focus-mcp/brick-cache'`); its tools `warmup` and `get` were never registered, so the task could not be completed using brick tools only

**Match**: divergent (manual check needed)

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `cache_get`, `cache_set`, `cache_invalidate`, `cache_warmup`, `cache_stats`
- Turns > 15 (brick): 16
- Brick slower than native by 55% (UX concern)

## Recommendations

_(empty — to be filled after analysis)_
