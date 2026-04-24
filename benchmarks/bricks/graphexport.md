# Fiche brick — graphexport

**Domaine** : Generate visualizations from a provided or upstream graph. For upstream graphs, use with graphbuild/callgraph/depgraph first. Alternatively, load an inline graph via ge_input(graph) to use standalone.
**Prefix** : `ge`
**Tools** : 7 (`input`, `html`, `mermaid`, `graphml`, `cypher`, `obsidian`, `wiki`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 545,715 | 966,283 | +77.1% ⚠️ |
| cache_creation | 38,113 | 49,903 | |
| cache_read | 497,788 | 906,296 | |
| output | 9,777 | 9,971 | |
| Turns (SDK) | 15 | 24 | |
| Duration (s) | 154.3 | 168.6 | +9% |

## Mini-task (iso)

Inspect the `package.json` for each of the 9 NestJS packages under `test-repo/packages/`: `common`, `core`, `microservices`, `platform-express`, `platform-fastify`, `platform-socket.io`, `platform-ws`, `testing`, and `websockets`. For each package, collect every entry under `peerDependencies` whose name starts with `@nestjs/`. Build a directed graph where each `@nestjs/*` package is a node (id = short name with hyphens/dots replaced by underscores, label = short name as-is, type = `"package"`) and each peerDependency relationship is an edge (from = dependent short name, to = dependency short name, type = `"peerDep"`). Load this graph via `ge_input`, then export it as a Mermaid `flowchart LR` diagram using `ge_mermaid` (direction `LR`). The expected answer is the complete Mermaid diagram text with nodes declared alphabetically and edges listed alphabetically (first by from-node ID, then by to-node ID), using underscores in node IDs for hyphens/dots. Expected format (exact):

```
flowchart LR
  common["common"]
  core["core"]
  microservices["microservices"]
  platform_express["platform-express"]
  platform_fastify["platform-fastify"]
  platform_socket_io["platform-socket.io"]
  platform_ws["platform-ws"]
  testing["testing"]
  websockets["websockets"]
  core --> common
  core --> microservices
  core --> platform_express
  core --> websockets
  microservices --> common
  microservices --> core
  microservices --> websockets
  platform_express --> common
  platform_express --> core
  platform_fastify --> common
  platform_fastify --> core
  platform_socket_io --> common
  platform_socket_io --> websockets
  platform_ws --> common
  platform_ws --> websockets
  testing --> common
  testing --> core
  testing --> microservices
  testing --> platform_express
  websockets --> common
  websockets --> core
  websockets --> platform_socket_io
```

## Tool coverage (brick mode)

- `ge_input` : not called ⚠️
- `ge_html` : not called ⚠️
- `ge_mermaid` : not called ⚠️
- `ge_graphml` : not called ⚠️
- `ge_cypher` : not called ⚠️
- `ge_obsidian` : not called ⚠️
- `ge_wiki` : not called ⚠️

**Coverage score**: 0/7 tools used

## Answers comparison

**Native answer**: ```
flowchart LR
  common["common"]
  core["core"]
  microservices["microservices"]
  platform_express["platform-express"]
... (32 total)
```

**Brick answer**: ```
flowchart LR
  common["common"]
  core["core"]
  microservices["microservices"]
  platform_express["platform-express"]
... (32 total)
```

**Match**: ✓ identical

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `ge_input`, `ge_html`, `ge_mermaid`, `ge_graphml`, `ge_cypher`, `ge_obsidian`, `ge_wiki`
- Turns > 15 (brick): 24
- Brick uses MORE tokens than native (966,283 vs 545,715)

## Recommendations

_(empty — to be filled after analysis)_
