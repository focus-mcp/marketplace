# @focus-mcp/diagram

Diagram generation — produce Mermaid, DOT/Graphviz, and ASCII diagrams from structured data.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `mermaid` | `diag_mermaid` | Generate a Mermaid diagram (flowchart, sequence, classDiagram, graph) |
| `dot` | `diag_dot` | Generate a DOT/Graphviz diagram (directed or undirected) |
| `ascii` | `diag_ascii` | Generate a simple ASCII box-and-arrow diagram |

## Examples

### Mermaid flowchart

```json
{
  "type": "flowchart",
  "nodes": [{ "id": "A", "label": "Start" }, { "id": "B", "label": "End" }],
  "edges": [{ "from": "A", "to": "B", "label": "go" }],
  "direction": "LR"
}
```

Output:
```
flowchart LR
    A[Start]
    B[End]
    A --> |go| B
```

### DOT directed graph

```json
{
  "nodes": [{ "id": "A" }, { "id": "B", "shape": "box" }],
  "edges": [{ "from": "A", "to": "B" }],
  "directed": true
}
```

Output:
```
digraph G {
    "A" [label="A"];
    "B" [label="B" shape=box];
    "A" -> "B";
}
```

### ASCII chain

```json
{
  "nodes": [{ "id": "A", "label": "Build" }, { "id": "B", "label": "Test" }, { "id": "C", "label": "Deploy" }],
  "edges": [{ "from": "A", "to": "B" }, { "from": "B", "to": "C" }]
}
```

Output:
```
┌────────┐
│ Build  │
└────────┘
   │
   ▼
┌────────┐
│ Test   │
└────────┘
   │
   ▼
┌────────┐
│ Deploy │
└────────┘
```
