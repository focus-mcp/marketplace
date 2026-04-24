# Fiche brick — impact

**Domaine** : Change impact analysis — given a file or symbol, find what files are affected by a change.
**Prefix** : `imp`
**Tools** : 3 (`analyze`, `affected`, `propagate`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 861,039 | 138,982 | -83.9% |
| cache_creation | 53,389 | 22,003 | |
| cache_read | 798,525 | 115,230 | |
| output | 9,074 | 1,724 | |
| Turns (SDK) | 19 | 6 | |
| Duration (s) | 116.3 | 48.8 | -58% |

## Mini-task (iso)

In the NestJS monorepo at `test-repo/`, a developer is about to modify `test-repo/packages/common/utils/load-package.util.ts`. Using change-impact analysis, identify all `.ts` files within `test-repo/packages/` (including test/spec files) that are **direct importers** of `packages/common/utils/load-package.util.ts` — i.e., files that contain an import statement referencing either the relative path (e.g., `../utils/load-package.util`, `../../utils/load-package.util`) or the package path `@nestjs/common/utils/load-package.util`. Do not include the source file itself (`packages/common/utils/load-package.util.ts`). List the results as paths relative to `test-repo/`, one per line, sorted alphabetically.

## Tool coverage (brick mode)

- `imp_analyze` : called ✓
- `imp_affected` : not called ⚠️
- `imp_propagate` : not called ⚠️

**Coverage score**: 1/3 tools used

## Answers comparison

**Native answer**: ```
packages/common/pipes/validation.pipe.ts
packages/common/serializer/class-serializer.interceptor.ts
packages/common/test/utils/load-package.util.spec.ts
packages/core/nest-application.ts
packages/core/nest-factory.ts
... (19 total)
```

**Brick answer**: ```
  packages/common/pipes/validation.pipe.ts
  packages/common/serializer/class-serializer.interceptor.ts
  packages/common/test/utils/load-package.util.spec.ts
  ```
```

**Match**: divergent (manual check needed)

## Observations

- Strong token savings (Δ=-83.9%) and wall-clock improvement (duration ratio 0.42x). Agent completed the task with 1/3 tools (`imp_analyze`). However, brick answer is partial: 3 files vs native's 19. The tool has a default result limit silently capping output.
- Gain in tokens is partly misleading — the brick returned far fewer results (3 vs 19), not faster computation. Callers from deeper package paths (`core/`, `microservices/`) were not returned.
- `imp_affected` and `imp_propagate` are transitive/propagation tools; only direct importers were requested, so `imp_analyze` was appropriate.

## Auto-detected issues

- Tools not called: `imp_affected`, `imp_propagate`
- Turns > 15 (native): 19

## Recommendations

- 🔧 Audit `imp_analyze` default limits — if results are capped silently, add an explicit `maxResults` parameter and/or pagination cursor so agents can request more.
- 📝 Mention partial-result risk in the brick description: "by default returns direct importers within the same package; use `imp_affected` for cross-package propagation".
