# Fiche brick — graphquery

**Domaine** : Knowledge graph query — find nodes, traverse neighbors, find paths, filter by type.
**Prefix** : `gq`
**Tools** : 5 (`query`, `node`, `neighbors`, `path`, `filter`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 1,665,257 | 547,729 | -67.1% |
| cache_creation | 81,118 | 37,356 | |
| cache_read | 1,573,713 | 504,811 | |
| output | 10,339 | 5,484 | |
| Turns (SDK) | 37 | 19 | |
| Duration (s) | 162.2 | 113.3 | -30% |

## Mini-task (iso)

Using the serialized NestJS dependency graph stored at `test-repo/integration/inspector/e2e/fixtures/post-init-graph.json`, find all graph nodes whose `type` is `"controller"` and return their `label` values sorted alphabetically, one per line.

The graph is a JSON object with a `"nodes"` property where each entry has an `"id"`, a `"label"`, and a `"metadata"` object that includes a `"type"` field. Filter to nodes where `metadata.type === "controller"`.

Expected answer format: a plain list of node label strings, sorted alphabetically, one per line (no extra formatting).

---

## Tool coverage (brick mode)

- `gq_query` : not called ⚠️
- `gq_node` : not called ⚠️
- `gq_neighbors` : not called ⚠️
- `gq_path` : not called ⚠️
- `gq_filter` : not called ⚠️

**Coverage score**: 0/5 tools used

## Answers comparison

**Native answer**: ```
  AppV1Controller
  AppV2Controller
  CatsController
  DatabaseController
  DogsController
... (11 total)
```

**Brick answer**: *(unavailable — brick tools could not be loaded)*

**Match**: divergent (manual check needed)

## Observations

- Brick achieves Δ=-67.1% despite 0/5 coverage — the savings come primarily from reduced tool-definition footprint in the system prompt. For this JSON-parsing task (filter nodes by type in a static JSON fixture), the agent found alternative paths without invoking any `gq_*` tools.
- The native run was extremely expensive (37 turns, 1,665,257 tokens) suggesting a challenging traversal; the brick context being smaller allowed faster convergence even without graph tools.
- Treat the token savings as a proxy for "agent context is smaller", not "graph query provided algorithmic leverage".

## Auto-detected issues

- Tools not called: `gq_query`, `gq_node`, `gq_neighbors`, `gq_path`, `gq_filter`
- Turns > 15 (brick): 19
- Turns > 15 (native): 37

## Recommendations

- 📝 Honest-framing for report: this is a "savings-from-context-reduction" result. Consider tasks where the graph must be traversed dynamically (multi-hop paths, neighbor queries) to test the brick's real query value.
- 🔧 Verify `gq_*` tools can load a JSON graph fixture directly — if they require `graphbuild` first, document this dependency.
