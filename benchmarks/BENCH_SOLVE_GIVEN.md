<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

You are benchmarking one FocusMCP brick. Mode: **brick**.

## Step 1 — Understand the brick

Read `./mcp-brick.json`. Identify the brick's name, domain, and exposed tools (names + input schemas).

## Mini-task (pre-specified)

> Note: all paths in the task spec below are relative to `./test-repo/`.

{{TASK_SPEC}}

## Step 2 — Solve using brick tools only

You are **forbidden** from using native filesystem/search tools (`Bash`, `Grep`, `Glob`, `Edit`, `Write`).
You MAY use `Read` once to inspect `./mcp-brick.json` if you have not already done so.
Solve using only the `mcp__focus__*` tools available in this session.

If the `focus` MCP server is not available, stop and output exactly:
`MODE UNAVAILABLE: focus MCP server not configured`

## Step 3 — Report

Output this exact structure and stop:

```
## Result
- **Brick**: <name>
- **Mode**: brick
- **Mini-task**: <one-line summary>
- **Answer**: <your actual answer, same format as requested in the task spec>
- **Turns used**: <integer>
- **Tools used**: <comma-separated list of mcp__focus__* tools called>
- **Rough token estimate**: <honest estimate>
- **Notes**: <tool limitations, unexpected behavior, fallbacks used, or anything worth flagging>
```

## Rules

1. Do NOT re-read this prompt file during execution.
2. Do NOT modify files outside `./test-repo/`.
3. Stop at ≤ 20 turns. If stuck, report partial.
4. Use brick tools for the actual task — `Read` is only allowed for Step 1 manifest inspection.
