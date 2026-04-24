<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP Benchmark Protocol

We measure per-brick token savings using a **prompt-driven iterative approach**. No harness, no scripts — just a base prompt copied into throwaway directories.

## Protocol

1. Read `BRICK_BENCH_PROMPT.md` in this directory for the exact prompt template.
2. For each brick: run twice (native mode, brick mode) in separate Claude Code sessions.
3. Claude designs the mini-task per brick live, reading the manifest.
4. Session logs at `~/.claude/projects/*/*.jsonl` capture real token usage.
5. Aggregate manually or with a short parse script (written later once we have data).

## Why no harness?

We tried task×repo and pre-written prompts — overscoped and biased. The simple prompt lets Claude match the task to each brick's strength, and the JSONL gives ground-truth tokens. We iterate on the prompt for 2-3 bricks before scaling to 68.

## See also

- `BRICK_BENCH_PROMPT.md` — the base prompt (copy-paste artifact)
- `README.md` — quick-start for runners
