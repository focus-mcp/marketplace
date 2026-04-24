# Fiche brick — share

**Domaine** : Shared state for multi-agent — share context, files, results between agents, broadcast messages.
**Prefix** : `shr`
**Tools** : 4 (`context`, `files`, `results`, `broadcast`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 379,275 | 573,965 | +51.3% ⚠️ |
| cache_creation | 19,736 | 56,335 | |
| cache_read | 354,670 | 507,455 | |
| output | 4,840 | 10,083 | |
| Turns (SDK) | 11 | 20 | |
| Duration (s) | 88.3 | 196.4 | +123% ⚠️ |

## Mini-task (iso)

You are analyzing the NestJS monorepo at `test-repo/`. Simulate a multi-agent workflow where:

- **Agent A** ("decorator-agent") is assigned the directory `test-repo/packages/common/decorators/` and would use the `share` brick (`shr:files`) to register all `.ts` files it owns.
- **Agent B** ("pipe-agent") is assigned the directory `test-repo/packages/common/pipes/` and would use the `share` brick (`shr:files`) to register all `.ts` files it owns.

After both agents register their files, a coordinator would read both registries and compile the combined list. Using the brick, determine the **combined, deduplicated, alphabetically-sorted list of `.ts` file basenames** (filename only — no directory path) that would be registered across both agents.

Expected answer format: one filename per line, sorted alphabetically. Only the filename (e.g. `index.ts`), not the full path.

---

## Tool coverage (brick mode)

- `shr_context` : called ✓
- `shr_files` : called ✓
- `shr_results` : called ✓
- `shr_broadcast` : not called ⚠️

**Coverage score**: 3/4 tools used

## Answers comparison

**Native answer**: ```
apply-decorators.ts
bind.decorator.ts
catch.decorator.ts
controller.decorator.ts
create-route-param-metadata.decorator.ts
... (43 total)
```

**Brick answer**: *(cannot determine)* — The `mcp__focus__*` tools have no filesystem enumeration capability. `shr_files` is a key-value registry that stores and retrieves file paths provided by agents; it does not scan directories. All shared state stores were empty (no pre-populated data). Discovering the actual `.ts` filenames in `test-repo/packages/common/decorators/` and `test-repo/packages/common/pipes/` requires filesystem tools (`Bash`, `Glob`, etc.), which are forbidden. The `shr_files` tool itself works correctly — reads confirmed empty registries — but registration is blocked by missing file-discovery capability.

**Match**: divergent (manual check needed)

## Observations

- Stateful brick — designed for multi-agent shared state. Single-task iso-bench cannot exercise multi-agent coordination; this task simulates it with a single agent.
- Regressive: +51.3% tokens, +123% duration. Coverage 3/4 — agent used `shr_context`, `shr_files`, and `shr_results`. But the brick answer is unavailable: `shr_files` is a key-value registry that requires file paths to be provided; it cannot discover files autonomously. No file-discovery tool was co-loaded.
- The regression is a tool-dependency gap: `share` brick needs `filelist` or `filesearch` co-loaded to enumerate files before registering them.

## Auto-detected issues

- Tools not called: `shr_broadcast`
- Turns > 15 (brick): 20
- Brick slower than native by 123% (UX concern)
- Brick uses MORE tokens than native (573,965 vs 379,275)

## Recommendations

- 🔧 Re-bench with `share` + `filelist` co-loaded to remove the filesystem discovery gap.
- 🔧 Re-bench in Phase 2b true multi-agent scenario where two agents share state — that is the real value proposition.
- 📝 Do not use single-task numbers for marketing on this brick.
