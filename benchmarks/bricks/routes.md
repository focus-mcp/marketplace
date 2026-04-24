# Fiche brick — routes

**Domaine** : API route detection — scan projects for Express, Fastify, Next.js, SvelteKit route definitions.
**Prefix** : `rt`
**Tools** : 4 (`scan`, `search`, `list`, `frameworks`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 675,063 | 540,149 | -20.0% |
| cache_creation | 24,916 | 32,803 | |
| cache_read | 645,656 | 502,463 | |
| output | 4,446 | 4,789 | |
| Turns (SDK) | 17 | 20 | |
| Duration (s) | 74.9 | 101.1 | +35% ⚠️ |

## Mini-task (iso)

Using the NestJS repository located at `test-repo/`, scan the sample application in `test-repo/sample/19-auth-jwt/src` and list every HTTP API endpoint defined via NestJS controller decorators. For each endpoint, construct the full URL path by combining the `@Controller(prefix)` value with each method-decorator argument (e.g. `@Get('profile')` under `@Controller('auth')` yields `GET /auth/profile`). Include only the HTTP method + full path; ignore decorators that are not one of `@Get`, `@Post`, `@Put`, `@Patch`, or `@Delete`.

Return the complete list as one endpoint per line in the format `METHOD /path`, sorted alphabetically (by the full line string).

## Tool coverage (brick mode)

- `rt_scan` : not called ⚠️
- `rt_search` : not called ⚠️
- `rt_list` : not called ⚠️
- `rt_frameworks` : not called ⚠️

**Coverage score**: 0/4 tools used

## Answers comparison

**Native answer**: ```
  GET /auth/profile
  POST /auth/login
  ```
```

**Brick answer**: *(unavailable — see Notes)*

**Match**: divergent (manual check needed)

## Observations

- Brick achieves Δ=-20% despite 0/4 coverage — the savings come from reduced system-prompt footprint. The brick could not be loaded (`@focus-mcp/brick-routes` npm package absent) — all tools were unavailable. The brick answer is also unavailable.
- The agent spent 20 turns attempting to work around the load failure, yet still achieved modest token savings due to smaller context. Duration regressed slightly (+35%).
- This is a loading-failure result, not a routes-detection measurement.

## Auto-detected issues

- Tools not called: `rt_scan`, `rt_search`, `rt_list`, `rt_frameworks`
- Turns > 15 (brick): 20
- Turns > 15 (native): 17
- Brick notes flagged: failed, error — "The `routes` brick is registered as installed (version `^0.0.0`) but the underlying npm module `@focus-mcp/brick-routes` is absent from the node environment (`/tmp/focus-bench/routes-brick-2026-04-24T"
- Brick slower than native by 35% (UX concern)

## Recommendations

- 🔧 Ensure `@focus-mcp/brick-routes` is published to npm and pre-installed in bench environment before re-running. Fix manifest version from `^0.0.0`.
- 📝 Exclude from Phase 1 summary stats — result measures load-failure overhead, not route-detection performance.
