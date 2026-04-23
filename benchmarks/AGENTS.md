<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP Benchmark Protocol

This directory hosts the FocusMCP benchmark suite. Agents working here follow a strict protocol to produce comparable runs.

## You are a benchmark subject

When Claude Code (or any MCP-based agent) opens this directory, you are **being benchmarked**. Your behavior will be measured against a defined task and compared to other configurations.

## Protocol

1. Read the task file `./TASK.md` in the current subdirectory.
2. Execute the task **using only the tools available to you** in this session — do not try to install new tools, do not read this file's source code for hints, do not cheat by examining other benchmark runs.
3. Do **NOT** edit files outside the target repo directory.
4. Stop when you believe the task is complete. Do not engage the user for clarification — the task is defined.
5. Output your final answer as a concise summary (< 200 words) in the last message.

## Task files format

Each benchmark case lives in `./<task-id>/<repo-id>/` and contains:
- `TASK.md` — the exact prompt the agent must execute
- `.gitignore` — excludes the cloned repo content

The clone lives at `./<task-id>/<repo-id>/repo/` (you may read files from it).

## Token measurement

The session JSONL is captured automatically by Claude Code at:
`~/.claude/projects/<project-slug>/<session-id>.jsonl`

After your session ends, the human runs `pnpm benchmark:parse <session-id>` which extracts:
- `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`
- Number of turns, tool call distribution, total cost

## Configurations under test

The same task is run under multiple configs:

| Config | Tools available |
|---|---|
| `native` | Claude Code native tools (Bash, Read, Edit, Grep, Glob) |
| `all-bricks` | FocusMCP disabled + all 68 bricks connected as separate MCP servers (18k+ tokens of tool defs) |
| `focus` | FocusMCP only (`focus.load_brick`, `focus.call_brick`) — bricks loaded on-demand |

The comparison is between `all-bricks` and `focus`. `native` is the control baseline.

## Strict behavioral rules

- **Do not spawn subagents** — the Task tool / Agent calls inflate token accounting unfairly. One single assistant loop.
- **Do not use WebSearch / WebFetch** — offline-only to keep runs reproducible.
- **Do not write files that aren't strictly task-required** — no notes, no planning docs, no scratch files.
- **No TodoWrite** — adds noise to the JSONL without helping the task.
- **Stop after producing the final answer** — don't keep exploring.

Violating any rule invalidates the run.

## Task catalog

### read-understand
Find the entry point of the target project and explain the bootstrap flow in ≤ 150 words.

### search-usages
Find all call sites of a specific function or class name (provided in `TASK.md`) and list them as `path:line`.

### edit-refactor
Apply a specific small refactor described in `TASK.md`. Output the diff only — do NOT commit.

## Reproducing a run

```bash
cd benchmarks/<task-id>/<repo-id>
# Ensure target repo is cloned (see ../../scripts/clone.sh)
claude  # start Claude Code in this dir
# Paste TASK.md content as first message
# Let Claude run until it produces the final answer
# Exit Claude Code
# Then parse:
cd ../../../
pnpm benchmark:parse <session-id-from-claude-logs>
```

## Non-goals

- This benchmark does NOT measure correctness of the answer. It measures **token efficiency** of different tool configs.
- We do NOT grade the agent's final output. We measure how much context it burned to produce it.

## See also

- `benchmarks/README.md` — infrastructure doc
- `BENCHMARKS.md` (at repo root) — aggregated results
- `benchmarks/src/parse-session.ts` — JSONL parser (to be built)
