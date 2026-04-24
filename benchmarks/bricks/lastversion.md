# Fiche brick — lastversion

**Domaine** : Package version intelligence — latest version, diff, changelog, audit across npm/pypi/github/gitlab.
**Prefix** : `lv`
**Tools** : 6 (`latest`, `versions`, `diff`, `changelog`, `check`, `audit`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 486,071 | 705,840 | +45.2% ⚠️ |
| cache_creation | 39,866 | 61,134 | |
| cache_read | 440,984 | 637,325 | |
| output | 5,189 | 7,280 | |
| Turns (SDK) | 11 | 20 | |
| Duration (s) | 85.2 | 132.4 | +55% ⚠️ |

## Mini-task (iso)

Inspect the `dependencies` field (production dependencies only, not `devDependencies`) in `test-repo/package.json`. For each of the 19 packages listed there, check the latest stable version available on npm. Identify every package whose pinned version is **strictly lower** than the latest stable version on npm. For each outdated package, report its name, the pinned version from package.json, and the latest stable npm version. Sort results alphabetically by package name. Answer format: one line per outdated package using the pattern `<package-name>: <pinned-version> → <latest-version>`. If no packages are outdated, report "none".

## Tool coverage (brick mode)

- `lv_latest` : not called ⚠️
- `lv_versions` : not called ⚠️
- `lv_diff` : not called ⚠️
- `lv_changelog` : not called ⚠️
- `lv_check` : not called ⚠️
- `lv_audit` : not called ⚠️

**Coverage score**: 0/6 tools used

## Answers comparison

**Native answer**: `file-type: 21.3.4 → 22.0.1`

**Brick answer**: Unable to complete — the `lastversion` brick failed to load. `focus_load` reports `Cannot find module '@focus-mcp/brick-lastversion'` (module missing from node environment). `focus_remove` returns "Lock entry not found", `focus_update` is not implemented, and `focus_reload` returns "Brick not found". The `lv__latest` / `lv__check` tools were never exposed. Without the brick tools and with native tools (Bash, Grep, etc.) forbidden, npm version lookups could not be performed.

**Match**: partial

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `lv_latest`, `lv_versions`, `lv_diff`, `lv_changelog`, `lv_check`, `lv_audit`
- Turns > 15 (brick): 20
- Brick answer is partial/not found
- Brick slower than native by 55% (UX concern)
- Brick uses MORE tokens than native (705,840 vs 486,071)

## Recommendations

_(empty — to be filled after analysis)_
