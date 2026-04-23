<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Task prompts

## read-understand

Template (replace `{repo_name}` + `{ref}`):

> Find the entry point of this {repo_name} project and explain the bootstrap flow in ≤ 150 words. The repo is cloned at `./repo/` (branch: {ref}).

## search-usages

Template (replace `{symbol}`):

> List all call sites of the symbol `{symbol}` in the code under `./repo/`. Output as `path:line` one per line. If more than 50 matches, list the first 50 in source order.

## edit-refactor

Template (replace `{file}`, `{from}`, `{to}`):

> In `./repo/{file}`, replace all uses of `{from}` with `{to}`. Preserve style and imports. Output the unified diff only — do NOT commit or push.
