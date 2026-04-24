<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

You are benchmarking one FocusMCP brick. Mode: **native**.

Your goal: design a mini-task that exercises this brick's strength, solve it using native tools only, and produce a paired spec so the same task can be run in brick mode.

## Step 1 — Understand the brick

Read `./mcp-brick.json`. Identify the brick's name, domain, exposed tools (names + input schemas), and what problems it is specifically designed to solve.

## Step 2 — Design a mini-task

Design **one** mini-task against `./test-repo/` (NestJS shallow clone):
- Directly exercises this brick's core strength
- Realistic work an agent would actually do
- Solvable in ≤ 10 turns with a deterministic, checkable answer
- Expressible as a self-contained instruction that needs no prior context

Write the task as `## Mini-task` (one paragraph).

**Path rule**: use paths relative to `./test-repo/` (e.g. `test-repo/packages/common`). Do NOT use absolute paths (`/tmp/…`, your session workdir, etc.) in either the task description or the spec — the spec must be portable across sessions.

## Step 3 — Solve in native mode

You are **forbidden** from using any `mcp__focus__*` tool.
Allowed tools: `Bash`, `Read`, `Grep`, `Glob` only.
No subagents, no `TodoWrite`, no `WebSearch`/`WebFetch`, no `Edit`/`Write`.

## Step 4 — Report

Output this exact structure and stop:

```
## Mini-task spec (for paired brick run)
<Precise, self-contained restatement of the mini-task. Another agent with no context must be able to solve it deterministically from this text alone. State the exact answer format expected (e.g. "list of file paths, one per line, sorted alphabetically"). Do NOT include the answer.>

## Result
- **Brick**: <name>
- **Mode**: native
- **Mini-task**: <one-line summary>
- **Answer**: <your actual answer>
- **Turns used**: <integer>
- **Tools used**: <comma-separated>
- **Rough token estimate**: <honest estimate>
- **Notes**: <anything unusual, blocked, or worth flagging>
```

## Rules

1. Do NOT re-read this prompt file during execution.
2. Do NOT modify files outside `./test-repo/`.
3. Stop at ≤ 20 turns. If stuck, report partial.
4. The `## Mini-task spec` block must be self-contained — no references to "above", "the manifest", or other session context.
5. All paths in `## Mini-task spec` must be relative to `./test-repo/`. No absolute paths.
