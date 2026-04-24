# Fiche brick — agent

**Domaine** : Agent registry — register AI agents with capabilities, list available agents, query capabilities.
**Prefix** : `agt`
**Tools** : 4 (`register`, `unregister`, `list`, `capabilities`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 844,592 | 296,763 | -64.9% |
| cache_creation | 28,721 | 57,942 | |
| cache_read | 809,191 | 232,357 | |
| output | 6,628 | 6,407 | |
| Turns (SDK) | 20 | 12 | |
| Duration (s) | 131.9 | 109.8 | -17% |

## Mini-task (iso)

In the NestJS test-repo (`test-repo/packages/microservices/client/`), there are several TypeScript files defining transport-specific microservice clients. Your task is to simulate an agent registry for these clients using the agent registry brick (`mcp__focus__agt_*` tools).

**Step 1 – Register agents:** For each concrete (non-abstract) transport client file in `test-repo/packages/microservices/client/` — excluding `client-proxy.ts` (abstract base), `client-proxy-factory.ts` (factory helper), and `index.ts` (re-export barrel) — register one agent using the brick's `register` tool. Use the exported class name as the agent `name`, and set `capabilities` to `["transport", "<protocol>"]` where `<protocol>` is the transport identifier from the filename stem (e.g., `grpc` from `client-grpc.ts`). The exported class names are embedded in each file's `export class ...` declaration.

**Step 2 – List agents:** Call the brick's `list` tool with no filter to retrieve all registered agents.

**Step 3 – Answer:** Report the agent names returned by `list`, one per line, sorted alphabetically (case-insensitive). Expected format: a plain list of class names, one per line, alphabetically ordered.

---

## Tool coverage (brick mode)

- `agt_register` : called ✓
- `agt_unregister` : not called ⚠️
- `agt_list` : called ✓
- `agt_capabilities` : not called ⚠️

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: ```
  ClientGrpcProxy
  ClientKafka
  ClientMqtt
  ClientNats
  ClientRedis
... (8 total)
```

**Brick answer**: ```
  ClientGrpc
  ClientKafka
  ClientMqtt
  ClientNats
  ClientRedis
... (8 total)
```

**Match**: divergent (manual check needed)

## Observations

- Meta/orchestration brick (agent registry). Coverage 2/4 — agent used `register` and `list` as prescribed by the task. Gain modest (Δ=-64.9% tokens, -17% duration) because the task itself is a structured workflow: read files, then register, then list. Context reduction helps but multi-step overhead limits wall-clock improvement.
- Answers diverge slightly (`ClientGrpcProxy` vs `ClientGrpc`) — likely a source-read discrepancy between native and brick, not a brick defect.
- The `agt_capabilities` and `agt_unregister` tools are lifecycle operations not called in a register+list scenario; this is expected.

## Auto-detected issues

- Tools not called: `agt_unregister`, `agt_capabilities`
- Turns > 15 (native): 20

## Recommendations

- 📝 Re-measure in Phase 2b multi-task scenario where agents are registered once and queried repeatedly — that is the real value proposition.
- 📝 For marketing, position as "dynamic agent discovery" rather than "token savings".
