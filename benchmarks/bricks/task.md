# Fiche brick — task

**Domaine** : Task management for multi-agent workflows — create tasks, assign to agents, track status, mark complete.
**Prefix** : `tsk`
**Tools** : 4 (`create`, `assign`, `status`, `complete`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 366,353 | 496,756 | +35.6% ⚠️ |
| cache_creation | 12,693 | 61,421 | |
| cache_read | 349,316 | 430,126 | |
| output | 4,315 | 5,153 | |
| Turns (SDK) | 11 | 17 | |
| Duration (s) | 81.1 | 85.1 | +5% |

## Mini-task (iso)

You are orchestrating a multi-agent code audit of a NestJS monorepo. Your job is to plan the task workflow as follows:

1. Identify all **package directories** (directories only, not files) inside `test-repo/packages/`. Sort them alphabetically.
2. For each package directory, create one task using the `tsk__create` tool with:
   - **title**: `"Audit: <package-name>"` (where `<package-name>` is the directory name)
   - **description**: `"Perform a code audit of the <package-name> package"`
   - **priority**: the package's 1-based rank in the alphabetically-sorted list (alphabetically first = priority 1, second = priority 2, etc.)
3. After creating all tasks, call `tsk__status` (with no arguments, or with status `"pending"`) to retrieve all tasks.
4. Report the final list of task titles and their priority numbers, sorted by priority ascending (one entry per line, format: `"<title>, priority=<N>"`).

The answer should be a list of 9 entries, one per package directory found in `test-repo/packages/`, sorted by priority. The exact answer format expected: one entry per line, e.g. `Audit: common, priority=1`.

---

## Tool coverage (brick mode)

- `tsk_create` : called ✓
- `tsk_assign` : not called ⚠️
- `tsk_status` : called ✓
- `tsk_complete` : not called ⚠️

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: ```
  Audit: common, priority=1
  Audit: core, priority=2
  Audit: microservices, priority=3
  Audit: platform-express, priority=4
  Audit: platform-fastify, priority=5
... (10 total)
```

**Brick answer**: ```
  Audit: common, priority=1
  Audit: core, priority=2
  Audit: microservices, priority=3
  Audit: platform-express, priority=4
  Audit: platform-fastify, priority=5
... (10 total)
```

**Match**: ✓ identical

## Observations

- Meta/orchestration brick (task management). Coverage 2/4 — agent used `tsk_create` and `tsk_status` as prescribed. Regressive: +35.6% tokens, +5% duration. Answers are identical ✓ (same 9 task entries).
- The regression reflects orchestration overhead: creating 9 tasks via `tsk_create` + reading them back via `tsk_status` adds more state management than native direct listing. The value is in persistent task tracking across turns, not token economy.
- `tsk_assign` and `tsk_complete` are lifecycle operations (assignment to agents, marking done) not exercised in a create+list scenario.

## Auto-detected issues

- Tools not called: `tsk_assign`, `tsk_complete`
- Turns > 15 (brick): 17
- Brick uses MORE tokens than native (496,756 vs 366,353)

## Recommendations

- 📝 Re-measure in Phase 2b multi-task scenario where tasks are created, assigned, and completed across multiple turns — that is where task tracking provides persistent value.
- 📝 For marketing, position as "multi-agent workflow coordination" rather than "token savings".
