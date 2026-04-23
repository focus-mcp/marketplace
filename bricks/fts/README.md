# @focusmcp/fts

Full-text search with TF-IDF ranking — index files, search with relevance scoring, suggest completions.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `index` | `fts_index` | Index a directory for full-text search |
| `search` | `fts_search` | Search the index with TF-IDF ranked results |
| `rank` | `fts_rank` | Rank a specific set of files by query relevance |
| `suggest` | `fts_suggest` | Auto-complete a partial query using indexed terms |

## How it works

The brick maintains an in-memory inverted index. Indexing a directory tokenizes each file (splitting on non-alphanumeric characters, filtering tokens shorter than 2 characters) and builds a term → postings map.

Scoring uses classic TF-IDF:
- **TF** = term count in document / total terms in document
- **IDF** = log(total documents / documents containing term)
- **Score** = sum of TF × IDF for each query term

The index is reset on each `fts:index` call.

## Supported file types (default)

`.ts`, `.js`, `.md`, `.json`

Custom extensions can be passed via the `glob` parameter (e.g. `*.ts,*.py`).
