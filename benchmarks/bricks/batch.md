# Fiche brick — batch

**Domaine** : Batch execution patterns — run multiple operations sequentially, in parallel, or as a pipeline.
**Prefix** : `bat`
**Tools** : 4 (`multi`, `sequential`, `parallel`, `pipeline`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 425,952 | 113,144 | -73.4% |
| cache_creation | 13,681 | 16,300 | |
| cache_read | 409,107 | 95,456 | |
| output | 3,131 | 1,366 | |
| Turns (SDK) | 11 | 5 | |
| Duration (s) | 49.9 | 28.6 | -43% |

## Mini-task (iso)

For each of the 9 packages inside `test-repo/packages/` — `common`, `core`, `microservices`, `platform-express`, `platform-fastify`, `platform-socket.io`, `platform-ws`, `testing`, `websockets` — count the number of TypeScript **source** files that meet **all** of the following criteria:
1. Filename ends with `.ts`
2. Filename does **not** end with `.d.ts` (exclude declaration files)
3. The file is **not** inside a directory named `test` or `spec` (i.e. exclude `**/test/**` and `**/spec/**`)

Use a separate `find` command per package, run them all in **parallel** (one `bat__parallel` call with 9 commands, `cwd` set to `test-repo`). Report results as one line per package in the format `<package-name>: <count>`, sorted **alphabetically** by package name.

Expected answer format — nine lines, alphabetical order:
```
common: <N>
core: <N>
microservices: <N>
platform-express: <N>
platform-fastify: <N>
platform-socket.io: <N>
platform-ws: <N>
testing: <N>
websockets: <N>
```

---

## Tool coverage (brick mode)

- `bat_multi` : not called ⚠️
- `bat_sequential` : not called ⚠️
- `bat_parallel` : called ✓
- `bat_pipeline` : not called ⚠️

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
  common: 186
  core: 178
  microservices: 132
  platform-express: 24
  platform-fastify: 15
... (10 total)
```

**Brick answer**: ```
common: 186
core: 178
microservices: 132
platform-express: 24
platform-fastify: 15
... (9 total)
```

**Match**: divergent (manual check needed)

## Observations

- Strong token savings (Δ=-73.4%) and wall-clock improvement (duration ratio 0.57x). Agent completed the task with 1/4 tools (`bat_parallel`). Answer (9 lines) matches native (10 lines) — native includes an extra summary line, not a data discrepancy.
- The agent naturally reached for `bat_parallel` to run 9 `find` commands concurrently, which is the exact intended use case. The brick provided genuine leverage for parallel shell execution.
- `bat_multi`, `bat_sequential`, and `bat_pipeline` are not exercised because this task has no sequential dependency chain or pipeline structure.

## Auto-detected issues

- Tools not called: `bat_multi`, `bat_sequential`, `bat_pipeline`
- Brick notes flagged: fallback — "All 9 commands completed successfully in parallel (total wall time 25ms). No fallbacks needed. The `find` filter used `! -name '*.d.ts'` to exclude declaration files and `! -path '*/test/*' ! -path '*"

## Recommendations

- 🟢 Keep as-is — `bat_parallel` is working as intended.
- 📝 Consider adding a task variant that forces sequential + pipeline patterns to exercise the other three tools in future bench phases.
