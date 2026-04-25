# Fiche brick — lastversion

**Domaine** : Package version intelligence — latest version, diff, changelog, audit across npm/pypi/github/gitlab.
**Prefix** : `lv`
**Tools** : 6 (`latest`, `versions`, `diff`, `changelog`, `check`, `audit`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 324,903 | 1,599,033 | +392.2% ⚠️ |
| cache_creation | 20,963 | 174,903 | |
| cache_read | 300,852 | 1,416,738 | |
| output | 3,064 | 7,223 | |
| Turns (SDK) | 8 | 56 | |
| Duration (s) | 57.8 | 115.1 | +99% ⚠️ |

## Mini-task (iso)

Examine the `dependencies` section (production dependencies only, not `devDependencies`) of `test-repo/package.json`. For each package listed there, check whether its pinned version matches the current latest stable release on npm. Identify every package whose pinned version is NOT equal to the latest stable npm version. For each such package, report: the package name, the pinned version from `package.json`, and the latest stable version on npm. Sort results alphabetically by package name. Express each result as a single line in this format: `<package-name> <pinned-version> <latest-version>`.

## Tool coverage (brick mode)

- `lv_latest` : called ✓
- `lv_versions` : called ✓
- `lv_diff` : not called ⚠️
- `lv_changelog` : not called ⚠️
- `lv_check` : called ✓
- `lv_audit` : not called ⚠️

**Coverage score**: 3/6 tools used

## Answers comparison

**Native answer**: `file-type 21.3.4 22.0.1`

**Brick answer**: Unable to determine — all `lv_*` brick tools failed with `No handler registered for "lastversion:latest"` (and equivalently for `check`, `versions`, `diff`). The brick reports as loaded (`focus_list` shows `lastversion [running]`), but no tool dispatch succeeds. Multiple unload/reload cycles did not resolve the issue.

**Match**: divergent (manual check needed)

## Observations

- Brick is severely regressive: +392.2% tokens, +99% duration, 56 turns. The brick is listed as loaded/running but every handler dispatch returns `No handler registered for "lastversion:<tool>"` — a server-side process registration bug, not a loading failure.
- The agent spent 56 turns attempting to invoke brick tools, work around the failure, and eventually complete the task natively. The regression entirely reflects this handler-dispatch bug.
- Despite the failure, the native fallback found the correct answer (`file-type 21.3.4 vs 22.0.1`).

## Auto-detected issues

- Tools not called: `lv_diff`, `lv_changelog`, `lv_audit`
- Turns > 15 (brick): 56
- Brick notes flagged: bug, fallback — "The `lastversion` brick is consistently listed as loaded/running but every handler dispatch returns `No handler registered for "lastversion:<tool>"`. This appears to be a server-side process registrat"
- Native notes flagged: failed — "`Read` failed on `./mcp-brick.json` due to permissions (path resolution quirk); worked fine via `Bash cat`. Among 19 production dependencies, only `file-type` is behind — pinned at `21.3.4` vs latest "
- Brick slower than native by 99% (UX concern)
- Brick uses MORE tokens than native (1,599,033 vs 324,903)

## Recommendations

- 🔧 Fix the handler registration bug — `lastversion` tool handlers are not being registered despite the brick reporting as running. Check the `start(ctx)` lifecycle hook.
- 📝 Exclude from Phase 1 summary stats — the result measures a critical runtime bug, not version-check performance.
