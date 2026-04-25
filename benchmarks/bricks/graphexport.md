# Fiche brick — graphexport

**Domaine** : Knowledge graph export — generate HTML, Mermaid, GraphML, Cypher, Obsidian, and wiki formats.
**Prefix** : `ge`
**Tools** : 6 (`html`, `mermaid`, `graphml`, `cypher`, `obsidian`, `wiki`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 303,007 | 662,818 | +118.7% ⚠️ |
| cache_creation | 9,032 | 93,812 | |
| cache_read | 288,186 | 558,129 | |
| output | 5,764 | 10,790 | |
| Turns (SDK) | 9 | 21 | |
| Duration (s) | 92.8 | 161.8 | +74% ⚠️ |

## Mini-task (iso)

Read each `packages/*/package.json` file inside `test-repo/`, extract every `peerDependencies` entry whose key starts with `@nestjs/`, and build a directed inter-package peer-dependency graph. Each NestJS package is a node (label = the short name after `@nestjs/`, e.g. `common`, `core`). Each directed edge `A --> B` means "package A lists package B in its `peerDependencies`".

Using only the nine packages found under `test-repo/packages/` (`common`, `core`, `microservices`, `platform-express`, `platform-fastify`, `platform-socket.io`, `platform-ws`, `testing`, `websockets`), produce a Mermaid flowchart with direction `LR`. Rules:

1. List `common` first as a standalone node (it has no outgoing `@nestjs` peer-dep edges).
2. List all directed edges next, sorted alphabetically first by source node name, then by target node name.
3. Output only the fenced Mermaid code block (` ```mermaid … ``` `), no other text.

---

## Tool coverage (brick mode)

- `ge_html` : not called ⚠️
- `ge_mermaid` : called ✓
- `ge_graphml` : not called ⚠️
- `ge_cypher` : not called ⚠️
- `ge_obsidian` : not called ⚠️
- `ge_wiki` : not called ⚠️

**Coverage score**: 1/6 tools used

## Answers comparison

**Native answer**: ```
flowchart LR
    common
    core --> common
    core --> microservices
    core --> platform-express
... (24 total)
```

**Brick answer**: ```
flowchart LR
  common
  core --> common
  core --> microservices
  core --> platform-express
... (24 total)
```

**Match**: divergent (manual check needed)

## Observations

- Brick is regressive: +118.7% tokens, +74% duration. Only `ge_mermaid` was called (1/6) but returned an empty graph. The focus graph had no nodes — `graphbuild` was not run first, so the export had nothing to export.
- The agent spent many extra turns trying to inject graph data via available tools, consuming 21 turns vs native's 9. The regression is a dependency-gap artifact.
- Same root cause as `graphcluster`: the `graphexport` brick requires a pre-built graph that was absent in this iso-bench context.

## Auto-detected issues

- Tools not called: `ge_html`, `ge_graphml`, `ge_cypher`, `ge_obsidian`, `ge_wiki`
- Turns > 15 (brick): 21
- Brick notes flagged: limitation — "The focus graph was empty (`ge_mermaid` returned only `"flowchart LR"` with no nodes or edges). None of the available `mcp__focus__*` tools support reading local files or injecting graph data — there "
- Brick slower than native by 74% (UX concern)
- Brick uses MORE tokens than native (662,818 vs 303,007)

## Recommendations

- 🔧 Document the `graphbuild` prerequisite in the brick description and consider adding a `ge_build_and_export` convenience shortcut.
- 📝 Exclude from Phase 1 summary stats — result measures dependency-gap overhead, not export quality.
