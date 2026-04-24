# Fiche brick — autopilot

**Domaine** : Autopilot workflow — autonomous task execution with reasoning, context management, and shell commands.
**Prefix** : `auto`
**Tools** : 3 (`plan`, `execute`, `status`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 573,735 | 241,517 | -57.9% |
| cache_creation | 24,179 | 58,599 | |
| cache_read | 544,796 | 181,544 | |
| output | 4,720 | 1,339 | |
| Turns (SDK) | 15 | 8 | |
| Duration (s) | 85.8 | 42.5 | -50% |

## Mini-task (iso)

You are working with the NestJS monorepo in `test-repo/`. Your task is to enumerate all HTTP route method decorators (excluding the base `RequestMapping` decorator itself) that are exported from `test-repo/packages/common/decorators/http/request-mapping.decorator.ts`.

Specifically: read that file, identify every exported `const` that is created via a call to `createMappingDecorator(...)`, and return them as a sorted alphabetical list (one name per line). Also state the total count of such decorators.

Expected answer format: a single integer count on the first line, followed by the names sorted alphabetically, one per line.

---

## Tool coverage (brick mode)

- `auto_plan` : not called ⚠️
- `auto_execute` : not called ⚠️
- `auto_status` : not called ⚠️

**Coverage score**: 0/3 tools used

## Answers comparison

**Native answer**: 16 decorators: All, Copy, Delete, Get, Head, Lock, Mkcol, Move, Options, Patch, Post, Propfind, Proppatch, Put, Search, Unlock

**Brick answer**: —

**Match**: ? (missing)

## Observations

- Brick achieves Δ=-57.9% despite 0/3 coverage — the savings come primarily from reduced tool-definition footprint in the system prompt, not from the brick's tools being actively used. For this read-and-enumerate task, the agent found alternative paths and completed without invoking `auto_plan`, `auto_execute`, or `auto_status`.
- The native answer lists 16 decorators but the brick answer is missing (`—`) — the agent appears to have answered the question directly from context rather than via brick tools, so the missing answer is likely a reporting artifact.
- Treat the token savings as a proxy for "agent context is smaller", not "autopilot provided algorithmic leverage".

## Auto-detected issues

- Tools not called: `auto_plan`, `auto_execute`, `auto_status`

## Recommendations

- 📝 Honest-framing for report: differentiate "savings-from-context-reduction" (generic to any focused brick) from "savings-from-better-tool" (brick domain advantage). Consider tasks that require multi-step autonomous execution to test the brick's real value.
- 📝 The missing brick answer should be investigated — if the agent answered directly, capture it; if it genuinely failed, flag as a tool-loading issue.
