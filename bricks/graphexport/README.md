# @focus-mcp/graphexport

Knowledge graph export — generate HTML, Mermaid, GraphML, Cypher, Obsidian, and wiki formats from an in-memory graph.

## Tools

| Tool | Exposed as | Description |
|------|------------|-------------|
| `html` | `ge_html` | Export as standalone HTML page with inline SVG visualization |
| `mermaid` | `ge_mermaid` | Export as Mermaid flowchart diagram syntax |
| `graphml` | `ge_graphml` | Export as GraphML XML (Gephi, yEd compatible) |
| `cypher` | `ge_cypher` | Export as Cypher CREATE statements (Neo4j compatible) |
| `obsidian` | `ge_obsidian` | Export as Obsidian-compatible markdown files with `[[wikilinks]]` |
| `wiki` | `ge_wiki` | Export as a single wiki-style markdown document |

## Usage

The brick reads from a shared in-memory graph (nodes + edges). Populate the graph first via `graphbuild`, then call any export tool.

### `ge_html`

```json
{ "title": "My Project Graph" }
```

Returns a self-contained HTML string with an SVG diagram.

### `ge_mermaid`

```json
{ "direction": "LR" }
```

Returns a Mermaid `flowchart` block. Valid directions: `TB`, `LR`, `BT`, `RL`.

### `ge_graphml`

```json
{}
```

Returns GraphML XML importable in Gephi, yEd, and similar tools.

### `ge_cypher`

```json
{}
```

Returns Neo4j-compatible `CREATE` statements for all nodes and relationships.

### `ge_obsidian`

```json
{}
```

Returns a map of `filename → markdown content` with `[[wikilinks]]` between connected nodes.

### `ge_wiki`

```json
{}
```

Returns a single markdown document with one `##` section per node listing outgoing and incoming connections.
