# @focus-mcp/knowledgebase

Composite knowledge base brick for FocusMCP — loads all knowledge sub-bricks.

This is a **composite brick**: it depends on `knowledge`, `fts`, `graphbuild`, and `graphquery`.
It exposes no tools of its own — the runtime loads and registers all sub-bricks automatically.

## Dependencies

| Brick | Description |
|-------|-------------|
| `knowledge` | Core document storage and retrieval |
| `fts` | Full-text search indexing and querying |
| `graphbuild` | Build and update knowledge graphs from documents |
| `graphquery` | Query knowledge graphs with graph traversal |
