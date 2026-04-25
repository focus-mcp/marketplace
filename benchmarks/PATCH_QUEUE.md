<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Patch Queue — FocusMCP bench optimizations

Live notes accumulated during the Phase 2a sweep (62 atomic bricks × NestJS, iso-task).
Each entry: brick + observed signal + suspected root cause + proposed action + priority.

**Status legend** : 🚨 blocker · ⚠️ high · 🔧 medium · 📝 low

---

## Regressions confirmed (brick worse than native)

### 🚨 `parallel` — +79% tokens, +874% latence (9× slower)

**Signal** : biggest latency regression. Agent wait-times dominate.
**Suspected** : brick probably serializes internally what advertises as parallel, or spawns subprocesses with big startup cost, or calls back into focus MCP inefficiently.
**Action** :
- Read `bricks/parallel/src/*` — profile where time is spent
- Check if tools have `async` behavior that forces sequential MCP round-trips
- Look at tool descriptions — maybe the agent uses the wrong tool for the task
**Priority** : 🚨 — FocusMCP claim broken on this brick, must fix or deprecate

### 🚨 `lastversion` — +392% tokens, +99% latence

**Signal** : **biggest token regression** (tokens nearly 5× native). 6 tools, only 1/6 used.
**Suspected** : tools return verbose output that dumps into agent context; or the agent has to read the manifest repeatedly because descriptions are unclear.
**Action** :
- Inspect 1 run JSON — what content does the brick echo back per call?
- Review tool descriptions for clarity — why does the agent only pick 1/6?
- Check if there's pagination/truncation missing on list-like outputs
**Priority** : 🚨

### ⚠️ `graphexport` — +119% tokens, +74% latence, coverage 1/6

**Signal** : high token cost, low tool coverage, slow.
**Suspected** : similar to lastversion — verbose output dumps + agent confused by 6 similar tools.
**Action** :
- Sample one run, look at payloads
- Collapse/clarify the 6 tools if they overlap
**Priority** : ⚠️

### ⚠️ `cache` — +52% tokens, +154% latence, **coverage 0/5**

**Signal** : agent **never** calls a `cache_*` tool (0/5 coverage). Brick loads but is dead weight.
**Suspected** : the cache brick only makes sense across multiple turns with state — single-task bench does not exercise it. OR descriptions do not hint when to use cache (agent can't discover utility from manifest alone).
**Action** :
- Review cache tool descriptions for "when to use this" cues
- Consider: is `cache` even benchmarkable in an iso-task single-agent setup? If not, exclude from sweep and note in report as "stateful brick — not measurable this way".
**Priority** : ⚠️ (also methodology discussion)

### 🚨 `fileops` — +379% tokens, 5.82× latence (Phase C3 SMOKING GUN — confirmed)

**Signal** : sweep-log-2026-04-24T06-57-42 reports +379% tokens and 5.82× duration.
The fiche `benchmarks/bricks/fileops.md` confirms the agent produced a **wrong-directory answer**
(10 files in a different dir instead of 6 files in the expected dir).

**Root cause confirmed** (Phase C3 investigation — 2026-04-25):

`_workRoot` in `bricks/fileops/src/operations.ts` defaults to `resolve(process.cwd())` at
**module load time** — i.e. the directory the MCP server process was started from.
In the benchmark harness the server is started from the marketplace root, not from
`test-repo/`. The agent calls `fo_copy`/`fo_rename` with relative paths like
`test-repo/packages/common/services/logger.service.ts`, which the brick resolves against
the marketplace root → ENOENT or wrong directory. The agent retries, calls extra tools,
diverges entirely. Token explosion and duration explosion are both retries/misdirection,
NOT payload bloat (each tool response is < 200 B).

**Secondary finding**: `fileops:setRoot` tool exists but the agent is never prompted to
call it. Tool description does not advertise it as a required initialisation step.

**Fix options** (do NOT implement in this PR — flag only):
1. **🚨 P0 — setRoot guard**: if `_workRoot` is still the default CWD and the first
   incoming path does not exist under it, throw a descriptive error:
   `"workRoot not set — call fileops:setRoot first with the absolute path to your workspace"`.
   This surfaces the bug immediately instead of silently operating on the wrong dir.
2. **⚠️ P1 — manifest description**: add to every tool description:
   `"Requires fileops:setRoot to be called first with the workspace root path."`.
   Agents will then invoke setRoot before any op.
3. **🔧 P2 — per-call root**: accept an optional `root` field on every tool input
   (analogous to `cwd` in shell commands). When present, override `_workRoot` for
   that call only. Avoids global state side-effects.

**Payload size**: confirmed < 200 B per response — NOT the cause of the regression.
`outputSizeUnder(2048)` invariant added in Phase C3 as safety net, but would NOT catch
this class of bug. A `setRoot` pre-condition guard (option 1) is the right sentinel.

**Files** : `bricks/fileops/src/operations.ts` (lines 15-16, 30-53)

**Priority** : 🚨 — confirmed production bug, causes silent wrong-directory operations
for any agent that does not explicitly call `fileops:setRoot` first.

### ⚠️ `memory` — +22% tokens, +110% latence

**Signal** : stateful brick, similar issue to cache.
**Suspected** : single-task bench ≠ memory use case. Agent has no prior session memory to recall.
**Action** :
- Likely exclude from single-task bench (stateful brick)
- OR design Phase 2b scenario that spans tasks to let memory shine
**Priority** : 🔧 methodology

### 🔧 `planning` — +11% tokens, coverage 4/4

**Signal** : mild regression, but **all 4 tools used** — agent found them useful but spent more tokens.
**Suspected** : planning tools add ceremony ("break task into steps") that for a simple iso-task costs more than just doing it.
**Action** :
- Planning is a meta-brick. May not make sense on a simple single-task bench.
- Consider scenario-bench (Phase 2b) only.
**Priority** : 🔧

---

## Regressions in latency only (tokens OK, UX hurt)

Bricks that save tokens but waste wall-clock. Candidate for latency optimization (batching, caching, fewer round-trips).

| Brick | Δ tokens | Δ latence |
|---|---:|---:|
| `graphbuild` | –11% | **+113%** |
| `graphquery` | –22% | –9% (mild) |
| `diagram` | –52% | +57% |
| `filewrite` | –22% | +68% |
| `inline` | –63% | +2% |
| `graphcluster` | –31% | +19% |

**Action template** : identify the slow tool call(s), reduce MCP round-trips or batch operations.

---

## Known CLI bugs (runtime / infra)

### ⚠️ No auto-install of brick dependencies

**Signal** : when a brick's `mcp-brick.json` declares `"dependencies": ["fileread", "symbol", ...]` (e.g. bundle bricks like `codebase`, `aiteam`, `codemod`), `focus add <bundle>` does not cascade-install the deps. At `focus start` the user gets:
```
error: Missing dependency "fileread"
```
and the MCP server aborts.

**Fix options**:
1. **Auto-install on add**: when `focus add X` runs, recursively install any dep listed in X's `mcp-brick.json`. Log what's being cascaded.
2. **Fail early on add**: refuse `focus add X` if deps are not installed, with a helpful `focus add X <dep-a> <dep-b>` suggestion.
3. **Fail clearer on start**: current message is fine but should list ALL missing deps at once (not one at a time) + suggest the exact `focus add ...` command.

**Priority**: ⚠️ — real user friction confirmed in production.

---

### 🔧 Missing `focus upgrade` / `focus upgrade-all` command

**Signal** : no way for users to upgrade installed bricks to latest catalog version without manually running `focus remove X && focus add X` for each. Also no `focus self-upgrade` for the CLI (users need `npm install -g @focus-mcp/cli@latest`).

**Fix** :
- Add `focus upgrade <name>` — re-installs a single brick at the latest version from the catalog. Essentially `remove + add` in one command, but preserves the enabled state and optional config.
- Add `focus upgrade --all` — does the above for every brick in `center.json`.
- Optional: `focus self-upgrade` that wraps `npm install -g @focus-mcp/cli@latest` (bonus — might be out of scope if users prefer their package manager directly).

**Priority** : 🔧 — daily friction for users, not blocking first install.

---



### 🔧 `center.lock` schema incomplete (CLI 1.2.0)

**Observed** : the lockfile generated by `focus add/remove` lacks fields that npm-style lockfiles standardize on:

- No `version` at the root (schema versioning)
- No `resolved` field per brick (absolute URL of the npm tarball, used for reproducible installs)
- Optionally missing `integrity` (SHA hash of the tarball)

Current shape:
```json
{
  "bricks": {
    "agent": { "version": "1.1.0", "catalogUrl": "...", "npmPackage": "@focus-mcp/brick-agent", "installedAt": "..." }
  }
}
```

Target shape (inspired by package-lock.json):
```json
{
  "lockfileVersion": 1,
  "bricks": {
    "agent": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@focus-mcp/brick-agent/-/brick-agent-1.1.0.tgz",
      "integrity": "sha512-...",
      "catalogUrl": "...",
      "npmPackage": "@focus-mcp/brick-agent",
      "installedAt": "..."
    }
  }
}
```

**Fix** : in `parseLockEntry` / `writeCenterLock`, add optional `lockfileVersion` at root (accept legacy files without it) and populate `resolved` + `integrity` after a successful `npm install` (the data is available in the install response).

**Priority** : 🔧 — non-blocking for install/load flow but needed for reproducibility and future migration. Ship in CLI 1.4.0 after the current 1.3.0 default-URL fix lands.

### Secondary note

A stale `catalogUrl: "http://localhost:8642/catalog.json"` was seen in a user's center.lock — residual from a local test install. Not a code bug, but worth a small guard: warn on install if `catalogUrl` is `localhost` or a private IP.

---



### ✅ `focus add` + `FilesystemBrickSource` layout mismatch — FIXED (PR focus-mcp/cli#38)

**Signal** : reproduced autonomously by Continue.dev (external AI agent) while attempting `focus add codebase` + `focus_load`. No human intervention — Continue hit the bug on its own, tried remove/install recovery, got stuck. This is an **external third-party reproduction** confirming the issue blocks real-world agent adoption.

Observed layout: `~/.focus/bricks/` ends up with `node_modules/@focus-mcp/brick-<name>/mcp-brick.json` (npm layout) while `FilesystemBrickSource.readManifest()` (cli/dist/bin/focus.js:2504) looks for `<bricksDir>/<name>/mcp-brick.json` → manifest never found, `focus_load` fails, brick "installed" but unreachable.

**Root cause** : `focus add <name>` runs `npm install @focus-mcp/brick-<name>` in `~/.focus/bricks/`. npm stores modules under `node_modules/<scope>/<pkg>/`. The resolver was written assuming a flat layout.

**Fix options** :
1. **Canonical** : change `FilesystemBrickSource` to use `require.resolve('@focus-mcp/brick-' + name + '/mcp-brick.json', { paths: [bricksDir] })`. Follows node_modules nesting natively. No duplication.
2. **Simple** : post-install copy/symlink `node_modules/@focus-mcp/brick-<name>/` → `<bricksDir>/<name>/`. Easier to debug but duplicates files.

**Impact on bench** : none. Our harness copies the right layout manually for each run.

**Priority** : 🚨 — core CLI bug, blocks any real user's `focus add` → `focus start` flow.

---

## Known brick bugs (implementation issues)

### 🔧 `filelist.fl_glob` — does not support `**` recursive globs

**Signal** : agent called `fl_glob("**/*.decorator.ts")`, got empty, fell back to `fl_find` + manual filter.
**Action** : support globstar (`**`) in `fl_glob`. Most glob libraries support it via an option.
**File** : `bricks/filelist/src/glob.ts` (or wherever the glob impl lives)
**Priority** : 🔧

---

## Manifest / description improvements

Bricks where agent picks poorly among tools or ignores some → descriptions unclear.

Candidates identified from the sweep (coverage < 50% AND delta < -30% meaning brick still wins despite under-use — room to do even better):

- `fullaudit` : 0/2 used, but still -88% tokens. Good sign but verify tools are useful in manifest.
- `onboarding` : 0/2 used, -77% tokens. Same.
- `autopilot` : 0/3 used, -58%.
- `outline` : 1/3 used, -80%.
- `impact` : 1/3 used, -84%.
- `refs` : 1/4, -80%.
- `rename` : 1/4, -84%.
- `contextpack` : 1/4, -85%.

**Action template** : for each, review tool descriptions to ensure differentiation. When one tool handles the common case and siblings are edge-case, that's fine. When the agent simply misses siblings, the descriptions need trigger-words.

**Priority** : 📝 (after regressions fixed)

---

## Methodology patches (bench itself)

### ⚠️ Stateful bricks are mis-measured by single-task bench

`cache`, `memory`, and possibly `session`, `share`, `knowledge` need **multi-turn or multi-task** scenarios to show their value. Iso-task single-agent bench systematically makes them look bad.

**Action** : flag these bricks in the report as "not measurable in single-task iso-task", and measure them in Phase 2b scenario instead (where tasks span a session and memory/cache can accumulate).

**Candidate stateful bricks** (to verify post-sweep):
- `cache` (confirmed non-functional this mode)
- `memory` (confirmed regression this mode)
- `session`, `share`, `knowledge`, `knowledgebase` (to verify)

### 🔧 Meta bricks (orchestrator-style) under-measured

`planning`, `agent`, `dispatch`, `autopilot`, `aiteam` (bundle), `debate`, `thinking`, `research` — these add reasoning meta-tools. On a simple iso-task, they add overhead.

**Action** : same as stateful — measure in Phase 2b scenario where multi-step reasoning is actually warranted.

### 📝 Bench-prompt: coverage-inducing task design

When agent designs the mini-task, it tends to pick a task that exercises **one** tool of the brick. Coverage is naturally low.

**Option** : add to `BENCH_DESIGN_AND_SOLVE.md`: "Prefer a task that would naturally exercise 2-3 tools of the brick, not just one — but don't force contrivance."

**Trade-off** : more coverage = better diagnostic, but longer mini-tasks = more tokens per run → worse if we care about comparing to native.

**Decision** : defer until after first full sweep is analyzed. If many bricks show coverage < 30% AND negative delta, consider the patch for a second pass.

---

## Not yet completed (sweep in progress)

`callgraph`, `depgraph`, `fts` — results pending (likely retries due to max-turns).

`graphcluster`, `graphquery` — fiches present but only partial data visible.

Will re-audit after sweep completion.

---

## Full sweep summary (62 bricks, 81 min wall clock, 51.4M tokens)

- ✅ **54 OK** — delta measured
- 🔴 **8 FAILED** — native hit max-turns (20), retry also failed

### Distribution (54 OK)

- **25 bricks excellent** (≥60% savings)
- **15 bricks moderate** (20-60% savings)
- **14 bricks regressing** (brick worse than native on tokens, latency, or both)

### 14 regressions — all need analysis

| Brick | Δ tokens | Duration ratio | Coverage | Signal |
|---|---:|---:|---|---|
| `fileops` | +379% | 5.82× | 1/4 | Batch-ops missing |
| `graphexport` | +119% | 1.74× | 1/6 | Tool bloat / 6 redundant |
| `metrics` | +103% | **6.06×** | 2/4 | Very slow computation or verbose output |
| `parallel` | +79% | **9.74×** | 3/4 | Severe latency — serialization issue |
| `share` | +51% | 2.23× | 3/4 | Stateful? |
| `sandbox` | +42% | 4.14× | 3/4 | Sandbox overhead dominates |
| `cache` | +38% | 1.90× | **0/5** | Stateful — not measurable single-task |
| `heatmap` | +29% | 0.84× | 2/4 | Tokens verbose |
| `research` | +23% | 3.49× | 3/3 | Meta brick / multi-step overhead |
| `lastversion` | +22% | 1.43× | 2/6 | Previously flagged at ~+392% pre-correction, corrected now |
| `planning` | +11% | 1.20× | 4/4 | Meta-brick |
| `memory` | +11% | 1.03× | 2/5 | Stateful — not measurable single-task |

### 8 FAILED bricks — RESULTS AFTER maxTurns=40 re-run (16 min, 15M tokens)

Re-run confirmed: with more turns, native **always finishes**. The "brick-only viable" marketing angle does NOT hold in iso-task.

**5 wins** (Category A):
- `graphquery` **–67%**
- `validate` **–65%**
- `review` –40%
- `routes` –20%
- `symbol` –4% (marginal)

**0 Category B** — no native run truly impossible with Claude Sonnet 4.6 at 40 turns.

**3 new regressions** (Category C — brick net-worse, *task-design flaw*):
- `callgraph` +18%
- `depgraph` +51%
- `treesitter` +66%

**Why C**: the iso-task generated by the native agent was solvable by trivial grep/read — it didn't require structural analysis. Not a brick bug; the bench picked a too-easy task for these bricks' strength.

**Action for C**: redesign the iso-task to force structural analysis that grep cannot do. Examples:
- `callgraph`: "Find all callee chains of depth ≥ 3 starting from `Module.onModuleInit`" (grep cannot traverse).
- `depgraph`: "Compute reverse-dependency closure for `@nestjs/common/cache` across all packages" (grep can't do closure).
- `treesitter`: "Count all `async` arrow functions nested inside class methods" (grep false-positives heavily).

Do NOT bump maxTurns further (60, 80...). The issue is task-design, not turn budget.

**Notes**:
- Coverage 0/N for all 8 in the re-run — harness artifact: the bootstrap `focus_install`/`focus_load` tools don't count as "brick tools used". Present in Phase 2a too. Cosmetic measurement issue.
- `symbol` had a transient maxTurns=40 failure on attempt 1 that succeeded on retry in 16 turns → task-generation variance. Not a brick issue.

### Top 10 wins (validated)

| Brick | Δ tokens | Duration ratio |
|---|---:|---:|
| `rename` | –84% | 0.55× |
| `contextpack` | –83% | 0.38× |
| `fullaudit` | –83% | 0.25× |
| `savings` | –82% | 0.22× |
| `filesearch` | –82% | 0.57× |
| `impact` | –81% | 0.40× |
| `filediff` | –81% | 0.31× |
| `decision` | –80% | 0.41× |
| `fts` | –80% | 0.56× |
| `refs` | –79% | 0.47× |

**Note**: top winners also **faster** (ratio < 1x). Counter to earlier concern that brick mode is slower.

### Methodology flags

- **Stateful bricks** (`cache`, `memory`, `session`, `share`, `knowledge`) systematically under-measured by iso-task single-agent bench → measure in Phase 2b scenario instead.
- **Meta bricks** (`agent`, `autopilot`, `dispatch`, `planning`, `research`, `debate`, `thinking`) add reasoning overhead that does not pay off on simple iso-tasks → measure in Phase 2b scenario.
- **Low coverage** (< 50%): 32/54 bricks. Normal, task exercises only 1-2 tools. If we want tool-level diagnostic we'd need multi-task per brick — deferred.

**Claim defensibility** : strong.
- Median savings: ~–60% on single-task iso-bench.
- Best-of-class: –80 to –85% on the top 10.
- Clean narrative: "FocusMCP bricks win on most common tasks, with anti-patterns clearly identified and being patched."
