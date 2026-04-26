# FocusMCP Benchmark Harness

Runs one brick × one mode benchmark, captures real token usage, and persists results.

## Requirements

- Node 24 + pnpm 10
- `focus` CLI in PATH (`focus start` must work)
- `~/benchmarks/test-repo` — shallow clone of `nestjs/nest`
- Claude Code OAuth configured (no API key needed)

## Setup

```bash
# Must use --ignore-workspace: harness is intentionally outside the marketplace pnpm workspace
pnpm install --ignore-workspace
```

## Validate auth

```bash
pnpm test-auth
# Expected: prints OK + usage fields
```

## Run a benchmark

```bash
pnpm run --brick filelist --mode native
pnpm run --brick filelist --mode brick
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--brick <name>` | required | Brick name (must exist in `../../bricks/<name>/mcp-brick.json`) |
| `--mode <native\|brick>` | required | Tool mode |
| `--max-turns <n>` | 20 | Max conversation turns |
| `--out-dir <path>` | `./results` | Output directory |

## Output

Result files are **always written**, even when the Claude SDK throws an exception
mid-stream (network timeout, malformed response, etc.). This prevents data-loss
during long sweeps.

- `exit_reason: "ok"` — completed successfully
- `exit_reason: "max_turns"` — max turns reached, partial result captured
- `exit_reason: "missing_spec"` — native run succeeded but no `## Mini-task spec` found
- `exit_reason: "error"` — SDK threw an exception; read `focus_stderr` for the full
  stack trace (prefixed with `[runner] SDK exception:`)

Each run writes `<out-dir>/<brick>-<mode>-<ISOstamp>.json`:

```json
{
  "brick": "filelist",
  "mode": "native",
  "model": "claude-sonnet-4-6",
  "started_at": "2026-04-23T...",
  "duration_ms": 12345,
  "turns": 6,
  "tools_used": ["Bash", "Glob"],
  "usage": { "input_tokens": 1234, "cache_creation_input_tokens": 0,
              "cache_read_input_tokens": 0, "output_tokens": 345, "total": 1579 },
  "session_id": "...",
  "result_block": "## Result\n...",
  "workdir": "/tmp/focus-bench/filelist-native-...",
  "exit_reason": "ok"
}
```

## Per-brick bench config

Bricks that structurally require more turns (e.g. multi-round-trip patterns like `parallel`, or
iterative debug patterns like `sandbox`) can declare a hint in their `mcp-brick.json`:

```json
{
  "name": "parallel",
  "bench": { "maxTurns": 40 }
}
```

The sweep reads `manifest.bench?.maxTurns` and uses `max(globalMaxTurns, manifest.bench.maxTurns)`.
The timeout is scaled proportionally (`base=10 min for 20 turns`).
A log line is emitted when the hint overrides the global: `[adaptive] parallel: using maxTurns=40 from manifest`.

Currently configured: `parallel` (40), `sandbox` (40). Global default: 20.

## Auto-retry on max_turns

When a run exits with `exit_reason=max_turns` on the **first attempt**, the harness automatically
escalates to `min(effectiveMaxTurns × 2, 80)` and retries once:

```
[escalate] parallel brick hit max_turns=40, retrying with 80
```

Escalation is capped at **80 turns** and limited to **1 extra attempt**. If the re-run also hits
`max_turns`, the result is accepted as a failure (partial/failed status in the summary).

## Isolation

Each run gets `/tmp/focus-bench/<brick>-<mode>-<stamp>/` with:
- `test-repo` → symlink to `~/benchmarks/test-repo`
- `mcp-brick.json` — copied manifest
- `.focus/` (brick mode only) — isolated center.json + brick copy, `HOME` overridden
