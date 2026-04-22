# @focus-mcp/graphcluster

Graph clustering — detect communities, explain groupings, identify architecture layers in a knowledge graph.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `cluster` | `gc_cluster` | Detect clusters using label propagation algorithm |
| `communities` | `gc_communities` | List communities with interconnection density |
| `explain` | `gc_explain` | Explain a cluster: types, hub nodes, edge types |
| `architecture` | `gc_architecture` | Detect architecture layers by directory and dependency direction |

## How it works

The brick operates on a shared in-memory graph (nodes + edges) loaded via the `setGraph` API (typically populated by `graphbuild`).

- **cluster / communities**: runs label propagation — each node adopts the most common label among its neighbors over 10 iterations, then groups are extracted.
- **explain**: for a given cluster index, surfaces common node types, hub nodes (highest degree), and edge types within the cluster.
- **architecture**: groups nodes by their path prefix (directory) and detects which layers depend on which by following outgoing cross-layer edges.
