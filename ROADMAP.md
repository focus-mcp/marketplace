<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP Bricks Roadmap

> Token reduction target: 200k tokens/session → 2-10k tokens/session
> Current measured: **98.2% reduction** (×55 factor) on real codebase

## Status Overview

| Priority | Total | Done | Remaining |
|----------|-------|------|-----------|
| Original | 27 | 27 | 0 |
| P1 | 15 | 15 | 0 |
| P2 | 18 | 18 | 0 |
| Composites | 5 | 5 | 0 |
| Workflows | 3 | 3 | 0 |
| Post-v1.0 | 1 | 1 | 0 |
| **Total** | **69** | **69** | **0** |

## v1.0.0 — Initial release (68 bricks) ✅

All 68 bricks shipped and published as `@focus-mcp/brick-<name>` on npmjs.org.

## v1.1.0 — lastversion brick ✅

- Added `lastversion` brick — checks the latest published version of any npm package.
  Published as `@focus-mcp/brick-lastversion`.

---

## Done (27 bricks)

### Files (10 bricks)
| Brick | Prefix | Tools | Type |
|-------|--------|-------|------|
| echo | echo | say | atomic |
| fileread | fr | read, head, tail, range | atomic |
| filewrite | fw | write, append, create | atomic |
| filelist | fl | list, tree, glob, find | atomic |
| fileops | fo | move, copy, delete, rename | atomic |
| filesearch | fsrch | search, replace | atomic |
| filediff | fd | diff, patch, delta | atomic |
| smartread | sr | full, map, signatures, imports, summary | atomic |
| multiread | mr | batch, dedup, merge | atomic |
| filesystem | fs | (orchestrates file bricks) | composite |

### Code Intelligence (5 bricks)
| Brick | Prefix | Tools | Type |
|-------|--------|-------|------|
| treesitter | ts | index, reindex, status, cleanup, langs | atomic |
| symbol | sym | find, get, bulk, body | atomic |
| callgraph | cg | callers, callees, chain, depth | atomic |
| depgraph | dep | imports, exports, circular, fanin, fanout | atomic |
| cache | cache | get, set, invalidate, warmup, stats | atomic |

### Context Optimization (4 bricks)
| Brick | Prefix | Tools | Type |
|-------|--------|-------|------|
| overview | ovw | project, architecture, conventions, dependencies | atomic |
| compress | cmp | output, response, terse | atomic |
| tokenbudget | tb | estimate, analyze, fill, optimize | atomic |
| smartcontext | sctx | load, refresh, status | composite |

### Code Structure (2 bricks)
| Brick | Prefix | Tools | Type |
|-------|--------|-------|------|
| outline | out | file, repo, structure | atomic |
| refs | refs | references, implementations, declaration, hierarchy | atomic |

### Persistence (2 bricks)
| Brick | Prefix | Tools | Type |
|-------|--------|-------|------|
| memory | mem | store, recall, search, forget, list | atomic |
| session | ses | save, restore, context, history | atomic |

### Analysis (3 bricks)
| Brick | Prefix | Tools | Type |
|-------|--------|-------|------|
| impact | imp | analyze, affected, propagate | atomic |
| repos | repos | list, register, unregister, stats | atomic |
| contextpack | cp | pack, budget, estimate, prioritize | atomic |

### Infrastructure
- Dynamic toolset: 6 meta-tools (list, describe, call, load, unload, reload)

---

## P1 — Advanced Features (15 bricks) ✅ Complete

### Search
| Brick | Prefix | Tools | Unlocks |
|-------|--------|-------|---------|
| textsearch | txt | search, regex, replace, grouped | composite: codemod |
| fts | fts | index, search, rank, suggest | composite: knowledgebase |
| semanticsearch | sem | search, similar, intent, embeddings | — |

### Execution
| Brick | Prefix | Tools | Unlocks |
|-------|--------|-------|---------|
| shell | sh | exec, background, kill, compress | composite: devtools |
| sandbox | box | run, file, eval, languages | composite: devtools |
| batch | bat | multi, sequential, parallel, pipeline | composite: devtools |

### Code Editing
| Brick | Prefix | Tools | Unlocks |
|-------|--------|-------|---------|
| rename | ren | symbol, file, bulk, preview | composite: codemod |
| codeedit | ce | replacebody, insertafter, insertbefore, safedelete | composite: codemod |
| inline | inl | inline, extract, move | composite: codemod |

### Reasoning
| Brick | Prefix | Tools | Unlocks |
|-------|--------|-------|---------|
| thinking | thk | think, branch, revise, summarize | workflow: autopilot |
| planning | plan | create, steps, dependencies, estimate | — |
| decision | dec | options, tradeoffs, recommend, record | — |

### Other
| Brick | Prefix | Tools | Unlocks |
|-------|--------|-------|---------|
| routes | rt | scan, search, list, frameworks | — |
| diagram | diag | mermaid, dot, ascii | — |
| knowledge | kb | index, search, fetch, purge, rank | composite: knowledgebase |

---

## P2 — Orchestration & Multi-Agent (18 bricks) ✅ Complete

### Knowledge Graph
| Brick | Prefix | Tools |
|-------|--------|-------|
| graphbuild | gb | build, update, watch, add, multimodal |
| graphquery | gq | query, node, neighbors, path, filter |
| graphcluster | gc | cluster, communities, explain, architecture |
| graphexport | ge | html, mermaid, graphml, cypher, obsidian, wiki |

### AI Orchestration
| Brick | Prefix | Tools |
|-------|--------|-------|
| dispatch | dsp | send, queue, cancel, status |
| parallel | par | run, collect, merge, timeout |
| debate | dbt | debate, consensus, score, summary |
| review | rev | code, security, architecture, compare |
| research | rsh | multisource, synthesize, validate |

### Multi-Agent
| Brick | Prefix | Tools |
|-------|--------|-------|
| agent | agt | register, unregister, list, capabilities |
| share | shr | context, files, results, broadcast |
| task | tsk | create, assign, status, complete |

### Analytics
| Brick | Prefix | Tools |
|-------|--------|-------|
| metrics | met | session, tokens, costs, duration |
| heatmap | hm | track, hotfiles, patterns, coldfiles |
| savings | sav | report, compare, trend, roi |

### Utilities
| Brick | Prefix | Tools |
|-------|--------|-------|
| format | fmt | json, yaml, markdown, table |
| validate | val | json, schema, types, lint |
| convert | conv | units, encoding, format, language |

---

## Post-v1.0 releases

### v1.1.0 — Version Intelligence
| Brick | Prefix | Tools | Package |
|-------|--------|-------|---------|
| lastversion | lastversion | check | `@focus-mcp/brick-lastversion` |

---

## Composites (all done)

| Composite | Prefix | Dependencies | Status |
|-----------|--------|-------------|--------|
| filesystem | fs | fileread, filewrite, filelist, fileops, filesearch | ✅ Done |
| smartcontext | sctx | smartread, cache, compress, tokenbudget, overview | ✅ Done |
| codebase | codebase | treesitter, symbol, outline, callgraph, depgraph, refs | ✅ Done |
| codemod | cmod | symbol, rename, codeedit, inline, textsearch | ✅ Done |
| devtools | dev | shell, sandbox, batch | ✅ Done |
| knowledgebase | kbase | knowledge, fts, graphbuild, graphquery | ✅ Done |
| aiteam | team | dispatch, parallel, debate, review, agent | ✅ Done |

## Workflows (all done)

| Workflow | Prefix | Dependencies | Status |
|----------|--------|-------------|--------|
| onboarding | onb | codebase, smartcontext, overview | ✅ Done |
| fullaudit | audit | codebase, review, metrics | ✅ Done |
| autopilot | auto | codebase, smartcontext, devtools, thinking | ✅ Done |

---

## Critical Path

```
✅ All P0 bricks complete (v1.0.0)
✅ All P1 bricks complete (v1.0.0)
✅ All P2 bricks complete (v1.0.0)
✅ All composites done
✅ All workflows done
✅ lastversion brick added (v1.1.0)
```

## Naming Convention

- Prefix: lowercase alphanumeric only `[a-z0-9]`
- Tool name: lowercase alphanumeric only `[a-z0-9]`
- CLI glue: `{prefix}_{tool}` → exposed as `mcp__focus__{prefix}_{tool}`
- Internal FocusMCP: no prefix → list, describe, call, load, unload, reload
- Reserved prefixes: focus, focusmcp, mcp, internal, system
- npm scope: `@focus-mcp/brick-<name>`
