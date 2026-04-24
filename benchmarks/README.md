<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Benchmarks

Per-brick token-savings measurement for FocusMCP. Read `AGENTS.md` for the protocol.

## Quick start

1. Clone `nestjs/nest` once at `~/benchmarks/test-repo/` (shallow, depth=1).
2. Pick a brick from `marketplace/bricks/<brick>/`.
3. Create a throwaway dir and copy the brick manifest + symlink the test repo:
   ```bash
   mkdir -p /tmp/focus-bench/<brick>-native && cd $_
   cp /path/to/marketplace/bricks/<brick>/mcp-brick.json .
   ln -s ~/benchmarks/test-repo ./test-repo
   ```
4. Launch Claude Code in that dir: `claude`
5. Paste `BRICK_BENCH_PROMPT.md` with `{{MODE}} = native` as the first message.
6. Let Claude complete the task, then exit.
7. Repeat in a **separate** throwaway dir with `{{MODE}} = brick` and `focus` MCP enabled.
8. Find both session JSONLs at `~/.claude/projects/*/*.jsonl` and diff the `usage` fields.

Iterate on 2-3 bricks first to stabilize the prompt before scaling.
