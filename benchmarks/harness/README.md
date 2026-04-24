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

## Isolation

Each run gets `/tmp/focus-bench/<brick>-<mode>-<stamp>/` with:
- `test-repo` → symlink to `~/benchmarks/test-repo`
- `mcp-brick.json` — copied manifest
- `.focus/` (brick mode only) — isolated center.json + brick copy, `HOME` overridden
