<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Benchmark case — `edit-refactor` on `tokio`

You are being benchmarked. Complete the task below using **only** FocusMCP tools. Token consumption will be measured from the session log.

## Task

In `./repo/`, locate the canonical README file. Produce a unified diff that adds a single line at the end of the file containing exactly: `<!-- focusmcp-benchmarked -->`. Do NOT write the file — output the diff text only. Use context of 3 lines. File paths in the diff should use `a/` and `b/` prefixes.

## Rules (strictly enforced)

1. Use **only** these tools: `mcp__focus__load_brick`, `mcp__focus__call_brick`, `mcp__focus__list_bricks`, `mcp__focus__unload_brick`.
2. Do **not** use: `Bash`, `Read`, `Edit`, `Write`, `Grep`, `Glob`, `Agent`/`Task` (subagents), `WebSearch`, `WebFetch`, `TodoWrite`, `NotebookEdit`.
3. Do **not** create, modify, or delete any file outside the `./repo/` tree unless the task explicitly asks for a diff.
4. Stop when you have the answer. Do not keep exploring.
5. Final output must be a single concise message (≤ 200 words) with the answer. No preamble, no trailing summary.

## Environment

- Target codebase: `./repo/` (symlinked to `../../../.cache/repos/tokio/`)
- Language: rust
- Profile: async-runtime
- Estimated LOC: ~80k

## Recommended bricks (hint)

`filelist`, `fileread`, `filediff`

You may load different bricks if you judge better. Load lazily — only what you need.

## Reporting your answer

Finish with a markdown block:

```
## Answer

<your concise answer here>
```

Done.
