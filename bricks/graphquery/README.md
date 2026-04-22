# @focusmcp/graphquery

Knowledge graph query — find nodes, traverse neighbors, find paths, filter by type.

## Tools

| Tool | Exposed as | Description |
|------|------------|-------------|
| `query` | `gq_query` | Find nodes by label substring and optional type |
| `node` | `gq_node` | Get full details of a node including all edges |
| `neighbors` | `gq_neighbors` | Find all nodes connected to a given node |
| `path` | `gq_path` | Find shortest path between two nodes (BFS) |
| `filter` | `gq_filter` | Extract a subgraph matching node/edge type criteria |

## Graph state

This brick operates on a shared in-memory graph (nodes + edges). Use `setGraph()` or the
`graphbuild` brick to populate the graph before querying.

```typescript
interface GraphNode { id: string; type: string; label: string; }
interface GraphEdge { from: string; to: string; type: string; }
```
