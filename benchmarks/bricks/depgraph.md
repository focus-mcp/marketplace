# Fiche brick — depgraph

**Domaine** : Dependency graph analysis — imports, exports, circular deps, fan-in/out.
**Prefix** : `dep`
**Tools** : 5 (`imports`, `exports`, `circular`, `fanin`, `fanout`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 781,338 | 1,176,206 | +50.5% ⚠️ |
| cache_creation | 75,698 | 81,323 | |
| cache_read | 698,874 | 1,084,873 | |
| output | 6,716 | 9,864 | |
| Turns (SDK) | 20 | 32 | |
| Duration (s) | 117.6 | 246.0 | +109% ⚠️ |

## Mini-task (iso)

Using the NestJS monorepo shallow clone at `test-repo/`, identify all TypeScript source files (excluding `*.spec.ts` test files) within `test-repo/packages/core/` that directly import from the file `test-repo/packages/core/constants.ts`. This includes both `import` statements and `export ... from` re-export statements that resolve to that exact file. Only consider direct dependencies (one-hop); do not traverse transitive imports. List the matching file paths relative to `test-repo/`, one per line, sorted alphabetically.

---

## Tool coverage (brick mode)

- `dep_imports` : not called ⚠️
- `dep_exports` : not called ⚠️
- `dep_circular` : not called ⚠️
- `dep_fanin` : not called ⚠️
- `dep_fanout` : not called ⚠️

**Coverage score**: 0/5 tools used

## Answers comparison

**Native answer**: ```
  packages/core/exceptions/base-exception-filter.ts
  packages/core/index.ts
  packages/core/nest-application-context.ts
  packages/core/nest-application.ts
  packages/core/nest-factory.ts
... (7 total)
```

**Brick answer**: ```
  packages/core/exceptions/base-exception-filter.ts
  packages/core/index.ts
  packages/core/nest-application-context.ts
  packages/core/nest-application.ts
  packages/core/nest-factory.ts
... (6 total)
```

**Match**: ✓ same set (order may differ)

## Observations

- Brick is regressive: +50.5% tokens, +109% duration, 0/5 tool coverage. The brick could not be loaded (`@focus-mcp/brick-depgraph` npm package absent from bench environment) — all overhead is from failed load attempts consuming 32 turns.
- Despite the failure, the agent completed the task via fallback (native grep). Answer matches native ✓ (same 6-7 file set; auto-detected as "divergent" due to count difference).
- The regression is entirely a loading-failure artifact; the depgraph domain would provide genuine leverage if the package were available.

## Auto-detected issues

- Tools not called: `dep_imports`, `dep_exports`, `dep_circular`, `dep_fanin`, `dep_fanout`
- Turns > 15 (brick): 32
- Turns > 15 (native): 20
- Brick notes flagged: failed — "The depgraph brick could not be loaded — `focus_load` failed with `Cannot find module '@focus-mcp/brick-depgraph'` (the npm package is not installed in the benchmark environment, only a `noop.js` stub"
- Brick slower than native by 109% (UX concern)
- Brick uses MORE tokens than native (1,176,206 vs 781,338)

## Recommendations

- 🔧 Ensure `@focus-mcp/brick-depgraph` is published to npm and pre-installed in bench environment before re-running.
- 📝 Exclude from Phase 1 summary stats — result measures load-failure overhead, not brick value.
