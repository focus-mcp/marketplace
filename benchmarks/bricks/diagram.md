# Fiche brick — diagram

**Domaine** : Diagram generation — produce Mermaid, DOT/Graphviz, and ASCII diagrams from data.
**Prefix** : `diag`
**Tools** : 3 (`mermaid`, `dot`, `ascii`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 519,868 | 251,138 | -51.7% |
| cache_creation | 33,356 | 42,122 | |
| cache_read | 481,509 | 201,108 | |
| output | 4,968 | 7,867 | |
| Turns (SDK) | 14 | 7 | |
| Duration (s) | 72.8 | 113.9 | +57% ⚠️ |

## Mini-task (iso)

Inspect the `peerDependencies` field in each `package.json` file found under `test-repo/packages/` (one level deep: `common`, `core`, `microservices`, `platform-express`, `platform-fastify`, `platform-socket.io`, `platform-ws`, `testing`, `websockets`). Identify every peer dependency that is itself a `@nestjs/*` package in that same directory. Then use the `mcp__focus__diag__mermaid` tool to generate a **Mermaid flowchart** with direction `LR` where:
- Each of the 9 packages is a node with a short identifier (e.g. `common`, `core`, `platform_express`, etc.) and a label showing the full `@nestjs/` package name.
- Each directed edge `A --> B` means "package A declares package B as a peer dependency".

Return the raw Mermaid diagram text (starting with `flowchart LR`) as the answer, with exactly the nodes and edges derived from the actual `peerDependencies` in those `package.json` files.

---

## Tool coverage (brick mode)

- `diag_mermaid` : called ✓
- `diag_dot` : not called ⚠️
- `diag_ascii` : not called ⚠️

**Coverage score**: 1/3 tools used

## Answers comparison

**Native answer**: ```
flowchart LR
  common["@nestjs/common"]
  core["@nestjs/core"]
  microservices["@nestjs/microservices"]
  platform_express["@nestjs/platform-express"]
... (32 total)
```

**Brick answer**: ```
flowchart LR
    common[@nestjs/common]
    core[@nestjs/core]
    microservices[@nestjs/microservices]
    platform_express[@nestjs/platform-express]
... (30 total)
```

**Match**: divergent (manual check needed)

## Observations

- Moderate token savings (Δ=-51.7%) but wall-clock regression (+57%). Agent completed the task with 1/3 tools (`diag_mermaid`). Answers diverge slightly (30 vs 32 total lines) — likely a formatting difference (node label quoting style) rather than missing content.
- The duration regression is notable: the brick generated a larger output (7,867 tokens vs 4,968) due to the mermaid tool returning formatted node labels, while native produced a more compact representation.

## Auto-detected issues

- Tools not called: `diag_dot`, `diag_ascii`
- Brick slower than native by 57% (UX concern)

## Recommendations

- 🔧 Investigate the 30 vs 32 line discrepancy — if caused by label quoting format differences, standardize the output format.
- 📝 Consider enriching `diag_dot` and `diag_ascii` descriptions so agents use the appropriate tool for non-Mermaid output requests.
