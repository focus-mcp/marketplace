<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP Marketplace

> Official catalog of 68+ bricks for [FocusMCP](https://github.com/focus-mcp/cli).

![Built with Claude Code](https://img.shields.io/badge/built_with-Claude_Code-8A2BE2)

## What's a brick?

A brick is an atomic MCP module with a well-defined scope.
Examples: `shell` runs commands, `echo` replies messages, `lastversion` checks package versions.

Users compose bricks on demand — only the ones they need load into their AI's context.

## Browse bricks

Use the FocusMCP CLI:

```bash
npm install -g @focus-mcp/cli
focus browse
```

Or view the raw catalog:

```bash
curl https://raw.githubusercontent.com/focus-mcp/marketplace/main/publish/catalog.json
```

## Categories

- **Files**: fileread, filewrite, filelist, fileops, filesearch, filediff, smartread, multiread
- **Code Intelligence**: treesitter, symbol, callgraph, depgraph, cache, outline, refs
- **Context**: smartcontext, overview, compress, tokenbudget, contextpack
- **Shell & Execution**: shell, sandbox, batch
- **Code Editing**: rename, codeedit, inline
- **Reasoning**: thinking, planning, decision
- **Search**: textsearch, fts, semanticsearch
- **Knowledge**: knowledge, graphbuild, graphquery, graphcluster, graphexport
- **Orchestration**: dispatch, parallel, debate, review, research, agent, share, task
- **Analytics**: metrics, heatmap, savings
- **Utilities**: format, validate, convert, diagram, routes
- **Workflows**: onboarding, fullaudit, autopilot
- **Version intelligence**: lastversion

(This list is for humans — the full catalog is at `catalog.json`)

## Contribute a brick

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## AI-assisted development

FocusMCP was built with heavy Claude Code assistance — its architecture, implementation,
docs, and tests have all been co-authored with AI. We embrace this openly because:

1. **Transparency matters** — we'd rather disclose it than pretend otherwise
2. **AI tooling is the context** — we're building tools for AI agents, it makes sense to use them
3. **Quality over origin** — what matters is that the code is tested, reviewed, and working

**Your AI-assisted contributions are welcome.** We don't require you to hide the fact that
Claude, Copilot, Cursor, or any other tool helped you. What we do expect:

- Tests pass, code is typed, lint is green
- You've read the diff and understand what the PR does
- Conventional Commits, clear PR description
- You can explain your design choices during review

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guidelines.

## License

[MIT](./LICENSE)
