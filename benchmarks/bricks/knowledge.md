# Fiche brick — knowledge

**Domaine** : Knowledge base — index documents, search by content, fetch entries, purge stale data, rank by relevance.
**Prefix** : `kb`
**Tools** : 5 (`index`, `search`, `fetch`, `purge`, `rank`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 594,070 | 465,562 | -21.6% |
| cache_creation | 22,934 | 88,741 | |
| cache_read | 565,911 | 372,614 | |
| output | 5,184 | 4,117 | |
| Turns (SDK) | 15 | 24 | |
| Duration (s) | 102.6 | 47.7 | -53% |

## Mini-task (iso)

The file `test-repo/packages/common/decorators/http/request-mapping.decorator.ts` exports multiple HTTP method route decorators. Each exported decorator (created via `createMappingDecorator`) has a JSDoc block immediately above its `export const` line containing a single description sentence (the line starting with `* Route handler (method) Decorator.`).

Your task:
1. For each such exported decorator (excluding `RequestMapping` itself), use the knowledge brick's `index` tool to index it as a knowledge base entry with:
   - `title` = the decorator name (e.g., `"Get"`, `"Post"`, `"Propfind"`)
   - `content` = the full JSDoc description sentence (e.g., `"Route handler (method) Decorator. Routes HTTP GET requests to the specified path."`)
   - `tags` = `["decorator", "http-method"]`
   - `source` = `"test-repo/packages/common/decorators/http/request-mapping.decorator.ts"`
2. Use the knowledge brick's `search` tool with query `"WebDAV"` to retrieve matching entries.
3. Report the `title` values (decorator names) of all entries returned by that search, sorted alphabetically, one per line.

Expected answer format: a plain list of decorator names, one per line, sorted alphabetically (case-sensitive, capital-first).

---

## Tool coverage (brick mode)

- `kb_index` : called ✓
- `kb_search` : called ✓
- `kb_fetch` : not called ⚠️
- `kb_purge` : not called ⚠️
- `kb_rank` : not called ⚠️

**Coverage score**: 2/5 tools used

## Answers comparison

**Native answer**: ```
  Copy
  Lock
  Mkcol
  Move
  Propfind
... (8 total)
```

**Brick answer**: Copy
  Lock
  Mkcol
  Move
  Propfind
  Proppatch
  Unlock

**Match**: divergent (manual check needed)

## Observations

- Stateful brick — designed for persistent knowledge indexing and recall across sessions. Single-task iso-bench exercises only a single index+search cycle, not the multi-session value proposition.
- Modest token savings (Δ=-21.6%) and significant duration improvement (-53%). Coverage 2/5 — agent used `kb_index` and `kb_search` as prescribed. Answers diverge (7 entries vs native's 8 — one WebDAV decorator missing), likely a search relevance threshold issue.
- The 24 brick turns vs 15 native turns suggests the indexing overhead is significant for a single small batch.

## Auto-detected issues

- Tools not called: `kb_fetch`, `kb_purge`, `kb_rank`
- Turns > 15 (brick): 24

## Recommendations

- 🔧 Investigate why one WebDAV decorator is missing from `kb_search` results — check relevance threshold or index completeness.
- 🔧 Re-bench in Phase 2b multi-task scenario (index once, search many times) to measure real knowledge-base amortized value.
- 📝 Do not use single-task numbers for marketing on this brick.
