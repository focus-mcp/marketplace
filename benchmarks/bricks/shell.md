# Fiche brick — shell

**Domaine** : Shell command execution — run commands, background processes, kill, and compress output.
**Prefix** : `sh`
**Tools** : 4 (`exec`, `background`, `kill`, `compress`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 593,909 | 134,363 | -77.4% |
| cache_creation | 28,525 | 14,842 | |
| cache_read | 561,208 | 118,397 | |
| output | 4,137 | 1,099 | |
| Turns (SDK) | 14 | 6 | |
| Duration (s) | 84.5 | 24.5 | -71% |

## Mini-task (iso)

In the NestJS monorepo located at `test-repo/`, count the number of TypeScript source files (files ending in `.ts`, but **excluding** files that end in `.spec.ts` and files that end in `.d.ts`) inside each package directory under `test-repo/packages/`. There are 9 package directories: `common`, `core`, `microservices`, `platform-express`, `platform-fastify`, `platform-socket.io`, `platform-ws`, `testing`, and `websockets`.

For each package, report the count as `<package-name>: <count>`, one entry per line, sorted alphabetically by package name. Count files recursively within each package directory.

Expected answer format (example layout, not actual values):
```
common: N
core: N
microservices: N
platform-express: N
platform-fastify: N
platform-socket.io: N
platform-ws: N
testing: N
websockets: N
```

Use a shell command such as `find <pkg-dir> -name "*.ts" ! -name "*.spec.ts" ! -name "*.d.ts" | wc -l` for each package.

---

## Tool coverage (brick mode)

- `sh_exec` : called ✓
- `sh_background` : not called ⚠️
- `sh_kill` : not called ⚠️
- `sh_compress` : not called ⚠️

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
  common: 187
  core: 179
  microservices: 135
  platform-express: 24
  platform-fastify: 15
... (10 total)
```

**Brick answer**: ```
common: 187
core: 179
microservices: 135
platform-express: 24
platform-fastify: 15
... (9 total)
```

**Match**: divergent (manual check needed)

## Observations

- Strong token savings (Δ=-77.4%) and excellent wall-clock improvement (duration ratio 0.29x). Agent completed the task with 1/4 tools (`sh_exec`). Answers match native ✓ (identical 9-package counts, auto-detected as "divergent" due to different total line count).
- The brick provides genuine leverage: `sh_exec` ran the `find | wc -l` commands efficiently, replacing multi-turn native exploration. `sh_background`, `sh_kill`, and `sh_compress` are long-running process management tools not needed for quick `find` commands.

## Auto-detected issues

- Tools not called: `sh_background`, `sh_kill`, `sh_compress`

## Recommendations

- 🟢 Keep as-is — `sh_exec` is working as intended for shell command tasks.
- 📝 Consider enriching `sh_background` description for long-running process scenarios (build, test suites) where it provides unique value.
