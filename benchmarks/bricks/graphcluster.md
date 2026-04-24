# Fiche brick — graphcluster

**Domaine** : Graph clustering — detect communities, explain groupings, identify architecture layers.
**Prefix** : `gc`
**Tools** : 4 (`cluster`, `communities`, `explain`, `architecture`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 695,089 | 478,337 | -31.2% |
| cache_creation | 26,991 | 30,045 | |
| cache_read | 661,094 | 441,608 | |
| output | 6,960 | 6,619 | |
| Turns (SDK) | 17 | 16 | |
| Duration (s) | 112.6 | 134.2 | +19% |

## Mini-task (iso)

In the NestJS monorepo located at `test-repo/packages/core/`, there are multiple top-level subdirectories representing distinct modules (e.g. `adapters`, `discovery`, `errors`, `exceptions`, `guards`, `helpers`, `hooks`, `injector`, `inspector`, `interceptors`, `interfaces`, `middleware`, `pipes`, `repl`, `router`, `services`). Analyze the TypeScript source files within these subdirectories to find all pairs of directories that have **bidirectional (mutual) import relationships** — meaning TypeScript files inside directory A contain imports whose path resolves to directory B, AND TypeScript files inside directory B contain imports whose path resolves to directory A (using `../dirName` relative import patterns).

List each bidirectional pair as two directory names separated by ` <-> `, with the two names sorted alphabetically within each pair. Sort all pairs alphabetically (first by the first name in the pair, then by the second). Produce one pair per line. Only consider top-level subdirectories of `test-repo/packages/core/` (not nested subdirectories); do not include the `test/` directory.

---

## Tool coverage (brick mode)

- `gc_cluster` : called ✓
- `gc_communities` : called ✓
- `gc_explain` : not called ⚠️
- `gc_architecture` : called ✓

**Coverage score**: 3/4 tools used

## Answers comparison

**Native answer**: ```
  discovery <-> injector
  errors <-> injector
  exceptions <-> helpers
  exceptions <-> router
  guards <-> helpers
... (13 total)
```

**Brick answer**: Unable to determine — the focus graph is empty; all `gc_*` tools (`gc_architecture`, `gc_cluster`, `gc_communities`, `gc_communities minSize=1`) returned zero nodes, zero clusters, and zero communities. No bidirectional pairs can be reported from tool output alone.

**Match**: divergent (manual check needed)

## Observations

- Moderate token savings (Δ=-31.2%) but duration regression (+19%). Coverage 3/4 — agent used `gc_cluster`, `gc_communities`, and `gc_architecture`. However, the brick answer is unavailable: the focus graph was empty (no nodes/edges), so all `gc_*` tools returned zero results and the task could not be completed via brick tools.
- The savings come from a smaller system prompt context; the brick itself provided no algorithmic output because it requires a pre-built graph (from `graphbuild`) that was not available.
- This is a dependency issue: `graphcluster` requires `graphbuild` to have been run first; iso-task bench doesn't exercise this dependency chain.

## Auto-detected issues

- Tools not called: `gc_explain`
- Turns > 15 (brick): 16
- Turns > 15 (native): 17

## Recommendations

- 🔧 Document the `graphbuild` → `graphcluster` dependency explicitly in the brick description, so agents know to run `gb_build` first.
- 📝 Re-measure in Phase 2b with a pre-built graph to assess true clustering value.
