# Fiche brick — semanticsearch

**Domaine** : Semantic search using TF-IDF vector space — cosine similarity, intent matching, document similarity.
**Prefix** : `sem`
**Tools** : 4 (`search`, `similar`, `intent`, `embeddings`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 1,203,760 | 241,941 | -79.9% |
| cache_creation | 56,466 | 117,340 | |
| cache_read | 1,136,124 | 121,352 | |
| output | 11,107 | 3,189 | |
| Turns (SDK) | 20 | 4 | |
| Duration (s) | 197.2 | 313.4 | +59% ⚠️ |

## Mini-task (iso)

Using the 12 TypeScript source files listed below from `test-repo/packages/core/injector/` as a TF-IDF document corpus (each document's text = full file contents), compute cosine similarity against the query **`"module exports imports controllers"`** and return the **top 3** most relevant files.

Corpus files (all relative to `test-repo/packages/core/injector/`):
- `abstract-instance-resolver.ts`
- `compiler.ts`
- `container.ts`
- `injector.ts`
- `instance-links-host.ts`
- `instance-loader.ts`
- `instance-wrapper.ts`
- `internal-providers-storage.ts`
- `module-ref.ts`
- `modules-container.ts`
- `module.ts`
- `settlement-signal.ts`

Use each file's full text content as the document body. Apply standard TF-IDF vectorization (tokenize by splitting on non-alpha characters, lowercase; IDF = log((N+1)/(df+1))+1; TF = term_count/doc_length; cosine similarity). Report the **top 3 results** as a list of bare filenames (no path prefix), one per line, ordered from most to least relevant (highest cosine similarity first).

---

## Tool coverage (brick mode)

- `sem_search` : called ✓
- `sem_similar` : not called ⚠️
- `sem_intent` : not called ⚠️
- `sem_embeddings` : not called ⚠️

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
  module.ts
  injector.ts
  instance-links-host.ts
  ```
```

**Brick answer**: ```
  module.ts
  instance-loader.ts
  container.ts
  ```
```

**Match**: divergent (manual check needed)

## Observations

- Strong token savings (Δ=-79.9%) and duration regression (+59%). Agent completed the task with 1/4 tools (`sem_search`). Answers diverge: brick returns a different top-3 (`module.ts`, `instance-loader.ts`, `container.ts`) vs native (`module.ts`, `injector.ts`, `instance-links-host.ts`) — both have `module.ts` first, but the remaining two differ.
- The divergence indicates different TF-IDF implementations or stemming strategies. Neither result is definitively "wrong" — semantic ranking produces valid but different orderings. The duration regression (+59%) is notable given the large token savings.

## Auto-detected issues

- Tools not called: `sem_similar`, `sem_intent`, `sem_embeddings`
- Turns > 15 (native): 20
- Brick slower than native by 59% (UX concern)

## Recommendations

- 📝 Document the TF-IDF implementation parameters (tokenizer, IDF formula, stop words) in the brick description so users can predict ranking behavior.
- 🔧 Profile the duration regression — 313s vs 197s native for a 4-turn brick run suggests the `sem_search` indexing step is slow; consider pre-indexing or caching the corpus vectors.
