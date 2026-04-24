# Fiche brick — dispatch

**Domaine** : Task dispatch queue — send tasks, manage queue, cancel, check status for multi-step workflows.
**Prefix** : `dsp`
**Tools** : 4 (`send`, `queue`, `cancel`, `status`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 519,331 | 284,110 | -45.3% |
| cache_creation | 13,260 | 29,504 | |
| cache_read | 500,574 | 251,503 | |
| output | 5,458 | 3,037 | |
| Turns (SDK) | 15 | 14 | |
| Duration (s) | 93.2 | 53.9 | -42% |

## Mini-task (iso)

In the NestJS monorepo at `test-repo/packages/microservices/server/`, several TypeScript files define transport-specific server classes (e.g. `server-grpc.ts`, `server-kafka.ts`, etc.). Your task is:

1. Identify every **concrete** (non-abstract) exported class whose name starts with `Server` in the files under `test-repo/packages/microservices/server/` — exclude the abstract base `Server` class (in `server.ts`) and exclude `ServerFactory` (in `server-factory.ts`).
2. Use the dispatch brick (`dsp` prefix) to **send one `build` task per transport class** to the queue, each with payload `{"class": "<ClassName>"}` and default priority.
3. After sending all tasks, call `dsp_queue` (status filter: `"pending"`) and report the **list of task `type` + `payload.class` values** from the queue response, sorted alphabetically by class name.

Expected answer format: a sorted list of class names, one per line (e.g. `ServerGrpc`, `ServerKafka`, …). There are exactly 7 such classes.

---

## Tool coverage (brick mode)

- `dsp_send` : called ✓
- `dsp_queue` : called ✓
- `dsp_cancel` : not called ⚠️
- `dsp_status` : not called ⚠️

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: ```
  ServerGrpc
  ServerKafka
  ServerMqtt
  ServerNats
  ServerRedis
... (8 total)
```

**Brick answer**: ```
  ServerGrpc
  ServerKafka
  ServerMqtt
  ServerNats
  ServerRedis
... (8 total)
```

**Match**: ✓ identical

## Observations

- Meta/orchestration brick (task dispatch queue). Coverage 2/4 — agent used `send` and `queue` as prescribed. Moderate savings (Δ=-45.3%) and duration improvement (-42%). Answers are identical ✓ (8 classes in both native and brick).
- The brick provided genuine leverage: `dsp_send` and `dsp_queue` replaced multi-turn file exploration with a structured queue workflow. `dsp_cancel` and `dsp_status` are lifecycle operations not needed for this create+list task.

## Auto-detected issues

- Tools not called: `dsp_cancel`, `dsp_status`

## Recommendations

- 🟢 Keep as-is — dispatch queue is working correctly for send+list scenarios.
- 📝 Re-measure in Phase 2b multi-task scenario where task cancellation and status polling provide qualitative workflow value.
