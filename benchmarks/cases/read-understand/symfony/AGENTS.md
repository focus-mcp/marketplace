<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Benchmark case — `read-understand` on `symfony`

You are being benchmarked. Complete the task below using **only** FocusMCP tools. Token consumption will be measured from the session log.

## Task

Find the main entry point of this Symfony project (language: php) and explain the bootstrap flow in ≤ 150 words. Focus on: where does the process start, what's the first function called, what modules are loaded initially.

## Rules (strictly enforced)

1. Use **only** these tools: `mcp__focus__load_brick`, `mcp__focus__call_brick`, `mcp__focus__list_bricks`, `mcp__focus__unload_brick`.
2. Do **not** use: `Bash`, `Read`, `Edit`, `Write`, `Grep`, `Glob`, `Agent`/`Task` (subagents), `WebSearch`, `WebFetch`, `TodoWrite`, `NotebookEdit`.
3. Do **not** create, modify, or delete any file outside the `./repo/` tree unless the task explicitly asks for a diff.
4. Stop when you have the answer. Do not keep exploring.
5. Final output must be a single concise message (≤ 200 words) with the answer. No preamble, no trailing summary.

## Environment

- Target codebase: `./repo/` (symlinked to `../../../.cache/repos/symfony/`)
- Language: php
- Profile: enterprise-di
- Estimated LOC: ~600k

## Recommended bricks (hint)

`overview`, `filelist`, `fileread`, `smartread`, `symbol`, `treesitter` (language-dependent), `onboarding`

You may load different bricks if you judge better. Load lazily — only what you need.

## Reporting your answer

Finish with a markdown block:

```
## Answer

<your concise answer here>
```

Done.
