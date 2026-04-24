# Fiche brick — depgraph

**Domaine** : Dependency graph analysis — imports, exports, circular deps, fan-in/out.
**Prefix** : `dep`
**Tools** : 5 (`imports`, `exports`, `circular`, `fanin`, `fanout`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 1,790,980 | 713,688 | -60.2% |
| cache_creation | 66,479 | 29,468 | |
| cache_read | 1,711,449 | 678,034 | |
| output | 12,969 | 6,063 | |
| Turns (SDK) | 30 | 26 | |
| Duration (s) | 179.4 | 117.7 | -34% |

## Mini-task (iso)

Using the **depgraph** brick's `fanin` tool, find all non-test TypeScript (`.ts`) source files within `test-repo/packages/core/` that directly import from `test-repo/packages/core/injector/container.ts`. "Directly import" means any `import ... from '...'` statement that resolves to that file (e.g. `from './container'`, `from '../container'`, `from '../injector/container'`, `from './injector/container'`). Exclude any file whose path contains `/test/`, and exclude `index.ts` re-export-only files (i.e., files that only have `export * from '...'` without any `import` statement referencing container). Return paths relative to `test-repo/`, sorted alphabetically, one per line.

## Tool coverage (brick mode)

- `dep_imports` : not called ⚠️
- `dep_exports` : not called ⚠️
- `dep_circular` : not called ⚠️
- `dep_fanin` : not called ⚠️
- `dep_fanout` : not called ⚠️

**Coverage score**: 0/5 tools used

## Answers comparison

**Native answer**: ```
packages/core/exceptions/base-exception-filter-context.ts
packages/core/exceptions/external-exception-filter-context.ts
packages/core/guards/guards-context-creator.ts
packages/core/helpers/external-context-creator.ts
packages/core/injector/instance-links-host.ts
... (22 total)
```

**Brick answer**: UNAVAILABLE — the `fanin` tool could not be invoked; see Notes.

**Match**: divergent (manual check needed)

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `dep_imports`, `dep_exports`, `dep_circular`, `dep_fanin`, `dep_fanout`
- Turns > 15 (brick): 26
- Turns > 15 (native): 30

## Recommendations

_(empty — to be filled after analysis)_
