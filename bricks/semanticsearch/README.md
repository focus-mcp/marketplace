# @focus-mcp/semanticsearch

Semantic search using TF-IDF vector space — cosine similarity, intent matching, document similarity. No external AI or embedding API required.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `search` | `sem_search` | Find documents most similar to a query using cosine similarity on TF-IDF vectors |
| `similar` | `sem_similar` | Find documents most similar to a given document by ID |
| `intent` | `sem_intent` | Classify a query against a set of intents (label + example phrases) |
| `embeddings` | `sem_embeddings` | Generate TF-IDF vector representations of texts |

## How it works

All tools use a **TF-IDF vector space model**:

1. **Tokenizer** — splits on non-alphanumeric characters, lowercases, filters tokens shorter than 2 characters
2. **TF-IDF** — term frequency × inverse document frequency across the provided corpus
3. **Cosine similarity** — dot(A, B) / (|A| × |B|) to measure semantic closeness

No network calls, no API keys, no external dependencies.
