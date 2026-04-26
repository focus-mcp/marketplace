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

## Brick mode tool isolation

**Brick mode exposes ONLY the brick's own MCP tools** — no native tools (`Read`, `Bash`, `Grep`, etc.).

### Why no Read in brick mode

Before this was fixed, `allowedTools` in brick mode included `Read` alongside the brick's MCP tools:

```typescript
// BEFORE (leaky) — Phase 2a sweeps
allowedTools: ['Read', ...manifest.tools.map((t) => `mcp__focus__${prefix}_${t.name}`)]
```

This caused three measurement problems:

1. **Inflated token counts** — the agent used `Read` to validate or compensate for unclear brick outputs, adding extra turns and tokens that had nothing to do with the brick.
2. **Hidden design defects** — bricks with incomprehensible outputs were rescued by `Read` fallbacks. The bench score looked acceptable when it shouldn't have.
3. **Wrong attribution** — `tools_used` contained `[Read, mcp__focus__par_collect, ...]`, making it impossible to tell what the brick actually did.

The fix is strict:

```typescript
// AFTER (strict) — Phase 2b and beyond
allowedTools: manifest.tools.map((t) => `mcp__focus__${prefix}_${t.name}`)
disallowedTools: ['Read', 'Bash', 'Grep', 'Glob', 'Edit', 'Write']
```

**Expected consequence:** some bricks will fail or score worse post-fix. This is intentional — it reveals real brick design defects (missing feedback fields, opaque outputs, no path/content snippets in results). Phase 2a sweeps are no longer comparable to post-fix sweeps.

## Isolation

Each run gets `/tmp/focus-bench/<brick>-<mode>-<stamp>/` with:
- `test-repo` → symlink to `~/benchmarks/test-repo`
- `mcp-brick.json` — copied manifest
- `.focus/` (brick mode only) — isolated center.json + brick copy, `HOME` overridden
