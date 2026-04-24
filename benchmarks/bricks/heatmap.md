# Fiche brick — heatmap

**Domaine** : File access heatmap — track read/write patterns, detect hot and cold files.
**Prefix** : `hm`
**Tools** : 4 (`track`, `hotfiles`, `patterns`, `coldfiles`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 849,592 | 231,272 | -72.8% |
| cache_creation | 30,785 | 29,594 | |
| cache_read | 811,054 | 196,905 | |
| output | 7,702 | 4,739 | |
| Turns (SDK) | 18 | 8 | |
| Duration (s) | 122.9 | 95.3 | -22% |

## Mini-task (iso)

You are working with the NestJS shallow-clone repository at `test-repo/`. Your task is to identify the "hottest" `@nestjs/common` module paths as seen from the `packages/core` package — i.e., the module paths most frequently imported by distinct source files there.

**Exact steps**:
1. Consider all `.ts` files under `test-repo/packages/core/` that are **not** `.spec.ts` and **not** `.d.ts` files (179 files total).
2. For each such file, extract every unique import path that starts with `@nestjs/common` (matching the pattern `from '@nestjs/common...'`). Deduplicate per file — if a file imports from the same path more than once, count it once for that file.
3. Across all files, count how many **distinct files** import from each `@nestjs/common` module path.
4. Return the **top 5** paths by count, sorted **descending** by count. Break ties **alphabetically** by path.

**Expected answer format**: one entry per line in the format `<module_path>: <count>`, e.g.:
```
@nestjs/common: 82
@nestjs/common/utils/shared.utils: 47
...
```

## Tool coverage (brick mode)

- `hm_track` : not called ⚠️
- `hm_hotfiles` : called ✓
- `hm_patterns` : not called ⚠️
- `hm_coldfiles` : not called ⚠️

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
  @nestjs/common: 82
  @nestjs/common/utils/shared.utils: 47
  @nestjs/common/interfaces: 38
  @nestjs/common/constants: 25
  @nestjs/common/utils/cli-colors.util: 7
... (6 total)
```

**Brick answer**: *(Cannot be computed — see Notes)*

**Match**: divergent (manual check needed)

## Observations

- Strong token savings (Δ=-72.8%) and wall-clock improvement (-22%). Agent completed the task with 1/4 tools (`hm_hotfiles`). However the brick answer is noted as unavailable ("Cannot be computed — see Notes"), suggesting `hm_hotfiles` was called but couldn't aggregate import frequency from source files without a file-reading tool.
- The token savings are real (context reduction), but the brick's domain value (access-frequency tracking) was not exercised — this is a tool-dependency gap, not a brick failure per se.

## Auto-detected issues

- Tools not called: `hm_track`, `hm_patterns`, `hm_coldfiles`
- Turns > 15 (native): 18

## Recommendations

- 🔧 `hm_hotfiles` needs a file-reading or indexing step before it can report import frequency — document this prerequisite and consider a `hm_build` or `hm_scan` bootstrapping tool.
- 📝 For marketing, position as "access pattern analytics over time" with multi-task scenarios rather than single-query analysis.
