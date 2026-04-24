<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Brick Benchmark — base prompt

Copy this prompt into a throwaway directory that contains:
- `mcp-brick.json` — the manifest of the brick being benchmarked (copy from `marketplace/bricks/<brick>/mcp-brick.json`)
- `test-repo/` — a clone of `https://github.com/nestjs/nest` (shallow, depth=1)

Then launch `claude` in that directory and paste the prompt below as the first message. Set `{{MODE}}` to either `native` or `brick`.

---

## PROMPT (copy below this line)

You are benchmarking **one** FocusMCP brick. Mode: `{{MODE}}`.

Your goal: solve a realistic mini-task that this brick is designed for, and honestly report how many turns and tokens it takes.

## Step 1 — Understand the brick

Read `./mcp-brick.json` in this directory. Identify:
- The brick's name and domain
- The tools it exposes (names + descriptions + input schema)
- What kind of problem this brick is specifically good at

## Step 2 — Design a mini-task

Design **one** mini-task to run against the `./test-repo/` NestJS codebase:
- Realistic work an AI agent would actually do
- Directly exercises this brick's strength (not a generic task)
- Solvable in ≤ 10 turns
- Has a deterministic, checkable answer
- Identical prompt for `native` and `brick` modes — do not tailor the task to the mode

Write the task in a markdown block titled `## Mini-task`.

## Step 3 — Solve it in the specified mode

### Mode `native`
You are **forbidden** from using any `mcp__focus__*` tool. Solve using only: `Bash`, `Read`, `Grep`, `Glob`. No subagents (`Agent`/`Task`), no `TodoWrite`, no `WebSearch`/`WebFetch`, no `Edit`/`Write` unless the task explicitly requires a file change.

### Mode `brick`
You are **forbidden** from using native filesystem/search tools (`Bash`, `Read`, `Grep`, `Glob`, `Edit`, `Write`). Solve using only the `mcp__focus__*` tools available to you in this session. You will typically call `mcp__focus__load_brick` then `mcp__focus__call_brick` with the tools declared in `mcp-brick.json`. No subagents, no `TodoWrite`, no web tools.

If the current session does not expose the `focus` MCP server, stop and report: `MODE UNAVAILABLE: focus MCP server not configured`.

## Step 4 — Report

When done, output a **single final markdown block** and stop:

```
## Result

- **Brick**: <brick-name>
- **Mode**: {{MODE}}
- **Mini-task**: <one-line summary>
- **Answer**: <your actual answer or "not found" / "partial">
- **Turns used**: <integer>
- **Tools used**: <comma-separated list of tool names>
- **Rough token estimate**: <your honest estimate based on file sizes read + output produced>
- **Notes**: <optional: anything weird, blocked, or cheated>
```

## Rules (enforced)

1. Do **NOT** read this prompt file looking for hints beyond the instructions.
2. Do **NOT** run both modes in one session. One mode per session.
3. Do **NOT** modify files outside `./test-repo/` unless the task explicitly asks for a diff (which should be output, not written).
4. Stop at ≤ 20 turns max. If stuck, report partial.
5. Be honest in the token estimate — we will cross-check via `~/.claude/projects/*/.jsonl` session logs after.

## Run protocol (human-side)

1. Pick a brick from `marketplace/bricks/<brick>/`
2. Create a throwaway dir: `mkdir -p /tmp/focus-bench/<brick>-<mode> && cd $_`
3. Copy the brick manifest: `cp marketplace/bricks/<brick>/mcp-brick.json ./`
4. Symlink the test repo: `ln -s ~/benchmarks/test-repo ./test-repo` (clone nestjs/nest once at that path)
5. Launch `claude` in the throwaway dir — ensure `focus` MCP is configured if mode=brick
6. Paste this prompt with `{{MODE}}` replaced by `native` or `brick`
7. When done, grab the session JSONL from `~/.claude/projects/*/` and store it with the brick name
8. Repeat for the other mode
9. Compare tokens (`input + cache_creation + cache_read + output`) between the two sessions

## After ~N bricks

Once you've run enough bricks, aggregate: `brick_name → native_tokens, brick_tokens, savings_pct`. A short script can parse the JSONL files. We can write it later once we see actual data.
