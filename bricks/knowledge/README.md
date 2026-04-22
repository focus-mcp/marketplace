# @focusmcp/knowledge

Knowledge base — index documents/notes, search by content, fetch entries, purge stale data, rank by relevance.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `index` | `kb_index` | Index a document or note into the knowledge base with tags and metadata |
| `search` | `kb_search` | Search the knowledge base by query, returns ranked results |
| `fetch` | `kb_fetch` | Fetch a specific knowledge entry by ID |
| `purge` | `kb_purge` | Remove entries older than a given age or matching specific tags |
| `rank` | `kb_rank` | Re-rank search results by recency, tag match, or content length |
