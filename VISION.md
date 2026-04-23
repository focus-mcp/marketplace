<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Vision — FocusMCP Marketplace

## The problem

MCP servers today bundle everything: a single server with 50 tools, take it or leave it. Agents pay the context cost even for tools they'll never use in a session.

## What we're building

A **catalog of atomic MCP bricks** — one brick, one domain, one small job done well. Users compose them on demand.

Think VS Code extensions marketplace, but for MCP. 68+ official bricks covering files, code intelligence, shell, reasoning, search, knowledge graphs, workflows. Each is a small npm package (`@focus-mcp/brick-<name>`).

## Principles

1. **Atomicity** — one brick, one domain. A brick that does file I/O and shell commands is two bricks.
2. **Composability** — bricks can call each other via the FocusMCP bus, enabling higher-level workflows
3. **Discoverability** — machine-readable `catalog.json`, searchable by tags, descriptions, semver
4. **Open** — anyone can fork the catalog or host their own. Third-party catalogs are first-class
5. **Quality first** — every official brick has tests, types, and docs. We'd rather have 68 great bricks than 680 mediocre ones

## How to contribute a brick

See [CONTRIBUTING.md](./CONTRIBUTING.md). Must be atomic, tested, documented, and follow the SPDX/Biome conventions.

## Non-goals

- Not exclusive — third-party catalogs are encouraged and supported
- Not a compatibility layer — existing MCP servers work fine without FocusMCP
- Not a distribution platform — bricks are plain npm packages
