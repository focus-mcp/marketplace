# Static Equivalence Report

Per-tool measurement. No LLM, no variance.
Token approximation: `Math.ceil(JSON.stringify(output).length / 4)`
Test fixture: `/home/samuelds/benchmarks/test-repo`
Date: 2026-04-27T11:33:19.511Z

## Full Results (sorted by Δ%, best first)

| Tool | Description | Native tokens | Brick tokens | Δ% |
|---|---|---:|---:|---:|
| `treesitter.ts_reindex` | Reindex a single file | 8,522 | 4 | **-100.0%** |
| `treesitter.ts_index` | Index core src with treesitter | 5,645 | 7 | **-99.9%** |
| `routes.rt_list` | List all routes as table | 6,796 | 10 | **-99.9%** |
| `routes.rt_scan` | Scan HTTP routes in core src | 7,354 | 12 | **-99.8%** |
| `routes.rt_frameworks` | Detect frameworks used in core | 2,415 | 5 | **-99.8%** |
| `fts.fts_index` | Index core source directory | 5,645 | 14 | **-99.8%** |
| `smartread.sr_summary` | Block summary of injector.ts | 8,522 | 20 | **-99.8%** |
| `refs.refs_hierarchy` | Class hierarchy of "Injector" in core | 2,678 | 7 | **-99.7%** |
| `treesitter.ts_status` | Treesitter index status | 5,645 | 16 | **-99.7%** |
| `textsearch.txt_replace` | Dry-run replace "Injectable" in tmp copy | 5,560 | 18 | **-99.7%** |
| `filesearch.fsrch_replace` | Dry-run replace "Injectable" in tmp copy | 5,560 | 21 | **-99.6%** |
| `semanticsearch.sem_search` | Semantic search "dependency injection" in core | 29,443 | 125 | **-99.6%** |
| `smartread.sr_signatures` | Export signatures of injector.ts | 8,522 | 44 | **-99.5%** |
| `routes.rt_search` | Search routes matching "/api" pattern | 1,050 | 6 | **-99.4%** |
| `rename.ren_symbol` | Dry-run rename "Injector" → "InjectorV2" in tmp | 2,678 | 16 | **-99.4%** |
| `symbol.sym_bulk` | Bulk get ["Injector","Injectable"] metadata | 8,237 | 56 | **-99.3%** |
| `inline.inl_inline` | Inline a function occurrence (dry-run) | 5,560 | 41 | **-99.3%** |
| `inline.inl_move` | Move symbol between files (dry-run) | 5,560 | 42 | **-99.3%** |
| `rename.ren_file` | Dry-run rename file in tmp | 2,678 | 25 | **-99.1%** |
| `outline.out_repo` | Repo outline of core/injector (find + read each) | 23,712 | 436 | **-98.1%** |
| `codeedit.ce_replacebody` | Replace body of function "constructor" (dry-run) | 5,105 | 101 | **-98.0%** |
| `rename.ren_bulk` | Dry-run bulk rename 2 symbols in tmp | 2,678 | 55 | **-98.0%** |
| `fts.fts_rank` | Rank files by relevance to "Injectable" | 5,560 | 127 | **-97.7%** |
| `smartread.sr_imports` | Import lines of injector.ts | 8,522 | 198 | **-97.6%** |
| `impact.imp_propagate` | Propagate impact from injector.ts (depth 2) | 12,930 | 347 | **-97.3%** |
| `compress.cmp_terse` | Terse (identifiers only) of injector.ts | 8,522 | 233 | **-97.2%** |
| `codeedit.ce_safedelete` | Safe delete check for symbol (dry-run) | 5,560 | 165 | **-97.0%** |
| `semanticsearch.sem_similar` | Find files similar to injector.ts | 2,678 | 89 | **-96.7%** |
| `impact.imp_affected` | Find files affected by changes to 3 TS files | 12,930 | 469 | **-96.3%** |
| `outline.out_file` | Outline symbols/imports of injector.ts | 8,522 | 323 | **-96.1%** |
| `symbol.sym_find` | Find all symbols named "Injector" in core | 2,678 | 157 | **-94.1%** |
| `fts.fts_search` | FTS search "Injectable" after indexing core | 5,560 | 370 | **-93.3%** |
| `smartread.sr_map` | Symbol map of injector.ts | 8,522 | 1,292 | **-84.3%** |
| `outline.out_structure` | Directory structure of core package | 5,645 | 956 | **-82.9%** |
| `textsearch.txt_grouped` | Grouped search "Injectable" by file | 5,560 | 968 | **-82.4%** |
| `refs.refs_references` | All refs to "Injector" symbol in core | 12,930 | 2,261 | **-82.0%** |
| `impact.imp_analyze` | Analyze impact of changing injector.ts | 12,930 | 2,350 | **-81.3%** |
| `treesitter.ts_langs` | List supported languages | 24 | 7 | **-70.7%** |
| `filelist.fl_tree` | Directory tree of core (depth 3) | 6,378 | 2,038 | **-67.7%** |
| `overview.ovw_project` | Project metadata (package.json parse) | 2,415 | 716 | **-66.7%** |
| `filediff.fd_patch` | Apply a simple unified patch to tmp file | 1,161 | 505 | **-55.1%** |
| `textsearch.txt_search` | Search "Injectable" with context lines | 5,560 | 2,613 | **-52.6%** |
| `rename.ren_preview` | Preview rename "Injector" occurrences in core | 2,678 | 1,401 | **-47.3%** |
| `overview.ovw_dependencies` | Dependency list vs raw package.json | 2,415 | 1,182 | **-45.1%** |
| `filesearch.fsrch_search` | Search "Injectable" in core src | 5,560 | 3,055 | **-44.6%** |
| `refs.refs_declaration` | Declaration of "Injector" symbol in core | 63 | 40 | **-35.5%** |
| `compress.cmp_output` | Compress injector.ts (medium level) | 8,522 | 6,605 | **-19.9%** |
| `fileread.fr_tail` | Last 10 lines of injector.ts | 56 | 51 | **-3.8%** |
| `textsearch.txt_regex` | Regex search "class\s+\w+Injector" in core | 1 | 11 | **+0.0%** |
| `refs.refs_implementations` | Implementations of "Injector" interface in core | 1 | 51 | **+0.0%** |
| `fts.fts_suggest` | Suggest completions for "Inject" prefix | 1 | 111 | **+0.0%** |
| `treesitter.ts_cleanup` | Cleanup treesitter index | 1 | 4 | **+0.0%** |
| `filediff.fd_delta` | Delta (line-level) between two file contents | 1,161 | 1,129 | **+0.4%** |
| `filelist.fl_glob` | Glob *.ts in core src | 5,645 | 5,713 | **+2.4%** |
| `filediff.fd_diff` | Diff two TS files (unified format) | 1,161 | 1,155 | **+2.7%** |
| `smartread.sr_full` | Full smart read of injector.ts | 8,522 | 8,525 | **+3.4%** |
| `fileread.fr_read` | Full read of injector.ts (baseline: identical) | 8,522 | 8,525 | **+3.4%** |
| `multiread.mr_merge` | Merge 5 TS files with separators | 8,246 | 8,268 | **+3.5%** |
| `multiread.mr_batch` | Batch read 5 TS files | 8,246 | 8,331 | **+4.3%** |
| `multiread.mr_dedup` | Dedup read 5 TS files (some duplicated) | 8,246 | 8,336 | **+4.4%** |
| `symbol.sym_body` | Get body of Injector (lines 1-50 of injector.ts) | 372 | 386 | **+7.7%** |
| `fileread.fr_range` | Lines 100-150 of injector.ts (1110 total) | 360 | 375 | **+8.3%** |
| `format.fmt_json` | Format raw package.json (pretty-print) | 2,415 | 2,421 | **+12.4%** |
| `fileread.fr_head` | First 10 lines of injector.ts | 54 | 58 | **+15.4%** |
| `filelist.fl_find` | Find "injector.ts" in core | 19 | 22 | **+21.1%** |
| `filewrite.fw_append` | Append line to file | 17 | 21 | **+25.8%** |
| `filewrite.fw_create` | Create a new file with content | 17 | 21 | **+26.2%** |
| `filewrite.fw_write` | Write (overwrite) existing file | 17 | 21 | **+26.2%** |
| `fileops.fo_delete` | Delete a tmp file | 18 | 22 | **+26.9%** |
| `filelist.fl_list` | List entries of core/injector dir | 90 | 108 | **+27.6%** |
| `symbol.sym_get` | Get single "Injector" symbol metadata | 26 | 48 | **+92.9%** |
| `fileops.fo_rename` | Rename file in tmp dir | 17 | 38 | **+128.8%** |
| `fileops.fo_copy` | Copy injector.ts to tmp | 16 | 36 | **+129.0%** |
| `fileops.fo_move` | Move file within tmp | 16 | 36 | **+131.1%** |
| `semanticsearch.sem_intent` | Classify intent of "show me the injector" | 9 | 31 | **+284.4%** |
| `semanticsearch.sem_embeddings` | Generate embeddings for 3 short texts | 16 | 87 | **+468.9%** |
| `inline.inl_extract` | Extract lines 10-30 of injector.ts into a function (dry-run) | 126 | 8,580 | **+7049.4%** |
| `codeedit.ce_insertafter` | Insert comment after line 5 (dry-run) | 54 | 17,632 | **+34987.1%** |
| `codeedit.ce_insertbefore` | Insert comment before line 5 (dry-run) | 54 | 17,647 | **+35016.9%** |

## Summary

| Metric | Value |
|---|---|
| Tools measured (ok) | 79 |
| Errors | 0 |
| Skipped (no native equivalent) | 174 |
| Total tools in scope (ok + errors) | 79 |
| Total catalog tools (243) | 243 |
| Coverage % | **32.5%** |
| Average Δ% (ok tools) | **942.3%** |
| Total native tokens | 366,912 |
| Total brick tokens | 127,348 |
| Overall token savings | **65.3%** |

## Top 10 Token Savers

| Tool | Description | Native tokens | Brick tokens | Δ% |
|---|---|---:|---:|---:|
| `treesitter.ts_reindex` | Reindex a single file | 8,522 | 4 | **-100.0%** |
| `treesitter.ts_index` | Index core src with treesitter | 5,645 | 7 | **-99.9%** |
| `routes.rt_list` | List all routes as table | 6,796 | 10 | **-99.9%** |
| `routes.rt_scan` | Scan HTTP routes in core src | 7,354 | 12 | **-99.8%** |
| `routes.rt_frameworks` | Detect frameworks used in core | 2,415 | 5 | **-99.8%** |
| `fts.fts_index` | Index core source directory | 5,645 | 14 | **-99.8%** |
| `smartread.sr_summary` | Block summary of injector.ts | 8,522 | 20 | **-99.8%** |
| `refs.refs_hierarchy` | Class hierarchy of "Injector" in core | 2,678 | 7 | **-99.7%** |
| `treesitter.ts_status` | Treesitter index status | 5,645 | 16 | **-99.7%** |
| `textsearch.txt_replace` | Dry-run replace "Injectable" in tmp copy | 5,560 | 18 | **-99.7%** |

## Errors / Skipped

### Errors (0)

| Tool | Error |
|---|---|
| — | none |

### Skipped (174) — no direct native equivalent

| Tool | Note |
|---|---|
**compute pure transform**
| `compress.cmp_response` | compute pure transform — no direct native equivalent |
| `format.fmt_markdown` | compute pure transform |
| `format.fmt_table` | compute pure transform |
| `format.fmt_yaml` | compute pure transform |
| `compress.cmp_response` | compute pure transform |
**compute pure**
| `convert.conv_encoding` | compute pure — no native equivalent |
| `convert.conv_format` | compute pure |
| `convert.conv_language` | compute pure |
| `convert.conv_units` | compute pure |
| `diagram.diag_mermaid` | compute pure |
| `diagram.diag_dot` | compute pure |
| `diagram.diag_ascii` | compute pure |
**stateful**
| `cache.cache_get` | stateful — requires persistent store |
| `cache.cache_set` | stateful |
| `cache.cache_invalidate` | stateful |
| `cache.cache_stats` | stateful |
| `cache.cache_warmup` | stateful |
**stateful cross-session**
| `memory.mem_store` | stateful cross-session |
| `memory.mem_recall` | stateful cross-session |
| `memory.mem_forget` | stateful cross-session |
| `memory.mem_list` | stateful cross-session |
| `memory.mem_search` | stateful cross-session |
**stateful multi-call**
| `session.ses_save` | stateful multi-call |
| `session.ses_restore` | stateful multi-call |
| `session.ses_history` | stateful multi-call |
| `session.ses_context` | stateful multi-call |
**stateful multi-agent**
| `share.shr_broadcast` | stateful multi-agent |
| `share.shr_context` | stateful multi-agent |
| `share.shr_files` | stateful multi-agent |
| `share.shr_results` | stateful multi-agent |
**stateful index**
| `knowledge.kb_index` | stateful index |
| `knowledge.kb_search` | stateful index |
| `knowledge.kb_fetch` | stateful index |
| `knowledge.kb_rank` | stateful index |
| `knowledge.kb_purge` | stateful index |
**orchestration**
| `parallel.par_run` | orchestration — no native equivalent |
| `parallel.par_collect` | orchestration |
| `parallel.par_merge` | orchestration |
| `parallel.par_timeout` | orchestration |
| `dispatch.dsp_send` | orchestration |
| `dispatch.dsp_queue` | orchestration |
| `dispatch.dsp_status` | orchestration |
| `dispatch.dsp_cancel` | orchestration |
| `agent.agt_list` | orchestration |
| `agent.agt_register` | orchestration |
| `agent.agt_unregister` | orchestration |
| `agent.agt_capabilities` | orchestration |
| `batch.bat_sequential` | orchestration |
| `batch.bat_parallel` | orchestration |
| `batch.bat_pipeline` | orchestration |
| `batch.bat_multi` | orchestration |
**orchestration meta**
| `autopilot.auto_plan` | orchestration meta |
| `autopilot.auto_execute` | orchestration meta |
| `autopilot.auto_status` | orchestration meta |
**meta AI planning**
| `planning.plan_create` | meta AI planning |
| `planning.plan_steps` | meta AI planning |
| `planning.plan_dependencies` | meta AI planning |
| `planning.plan_estimate` | meta AI planning |
**meta AI**
| `thinking.thk_think` | meta AI |
| `thinking.thk_branch` | meta AI |
| `thinking.thk_revise` | meta AI |
| `thinking.thk_summarize` | meta AI |
| `decision.dec_options` | meta AI |
| `decision.dec_tradeoffs` | meta AI |
| `decision.dec_recommend` | meta AI |
| `decision.dec_record` | meta AI |
**meta multi-AI**
| `debate.dbt_debate` | meta multi-AI |
| `debate.dbt_consensus` | meta multi-AI |
| `debate.dbt_score` | meta multi-AI |
| `debate.dbt_summary` | meta multi-AI |
| `aiteam.aiteam_*` | meta multi-AI |
**CLI meta tool**
| `focus.focus_load` | CLI meta tool |
| `focus.focus_unload` | CLI meta tool |
| `focus.focus_list` | CLI meta tool |
| `focus.focus_reload` | CLI meta tool |
| `focus.focus_install` | CLI meta tool |
| `focus.focus_remove` | CLI meta tool |
| `focus.focus_search` | CLI meta tool |
| `focus.focus_update` | CLI meta tool |
| `focus.focus_catalog_list` | CLI meta tool |
| `focus.focus_catalog_add` | CLI meta tool |
| `focus.focus_catalog_remove` | CLI meta tool |
**VM execution**
| `sandbox.box_eval` | VM execution — no native equivalent |
| `sandbox.box_run` | VM execution |
| `sandbox.box_file` | VM execution |
| `sandbox.box_languages` | VM execution |
**observability**
| `metrics.met_tokens` | observability — no native equivalent |
| `metrics.met_costs` | observability |
| `metrics.met_duration` | observability |
| `metrics.met_session` | observability |
| `tokenbudget.tb_estimate` | observability |
| `tokenbudget.tb_fill` | observability |
| `tokenbudget.tb_analyze` | observability |
| `tokenbudget.tb_optimize` | observability |
**observability stateful**
| `heatmap.hm_hotfiles` | observability stateful |
| `heatmap.hm_coldfiles` | observability stateful |
| `heatmap.hm_patterns` | observability stateful |
| `heatmap.hm_track` | observability stateful |
| `savings.sav_report` | observability stateful |
| `savings.sav_compare` | observability stateful |
| `savings.sav_roi` | observability stateful |
| `savings.sav_trend` | observability stateful |
**compute API-bound**
| `validate.val_json` | compute API-bound |
| `validate.val_lint` | compute API-bound |
| `validate.val_schema` | compute API-bound |
| `validate.val_types` | compute API-bound |
**external API-bound**
| `lastversion.lastversion_*` | external API-bound |
**workflow/state**
| `repos.repos_list` | workflow/state |
| `repos.repos_register` | workflow/state |
| `repos.repos_unregister` | workflow/state |
| `repos.repos_stats` | workflow/state |
| `task.tsk_create` | workflow/state |
| `task.tsk_assign` | workflow/state |
| `task.tsk_status` | workflow/state |
| `task.tsk_complete` | workflow/state |
| `research.rsh_multisource` | workflow/state |
| `research.rsh_synthesize` | workflow/state |
| `research.rsh_validate` | workflow/state |
| `onboarding.onb_scan` | workflow/state |
| `onboarding.onb_guide` | workflow/state |
**workflow composite**
| `fullaudit.audit_run` | workflow composite |
| `fullaudit.audit_report` | workflow composite |
**graph state**
| `graphbuild.gb_build` | graph state |
| `graphbuild.gb_add` | graph state |
| `graphbuild.gb_update` | graph state |
| `graphbuild.gb_multimodal` | graph state |
| `graphbuild.gb_watch` | graph state |
| `graphquery.gq_query` | graph state |
| `graphquery.gq_node` | graph state |
| `graphquery.gq_neighbors` | graph state |
| `graphquery.gq_path` | graph state |
| `graphquery.gq_filter` | graph state |
| `graphcluster.gc_cluster` | graph state |
| `graphcluster.gc_communities` | graph state |
| `graphcluster.gc_architecture` | graph state |
| `graphcluster.gc_explain` | graph state |
| `graphexport.ge_mermaid` | graph state |
| `graphexport.ge_cypher` | graph state |
| `graphexport.ge_graphml` | graph state |
| `graphexport.ge_html` | graph state |
| `graphexport.ge_obsidian` | graph state |
| `graphexport.ge_wiki` | graph state |
| `callgraph.cg_callers` | graph state |
| `callgraph.cg_callees` | graph state |
| `callgraph.cg_chain` | graph state |
| `callgraph.cg_depth` | graph state |
| `depgraph.dep_imports` | graph state |
| `depgraph.dep_exports` | graph state |
| `depgraph.dep_fanin` | graph state |
| `depgraph.dep_fanout` | graph state |
| `depgraph.dep_circular` | graph state |
**composite multi-step**
| `contextpack.cp_pack` | composite multi-step |
| `contextpack.cp_estimate` | composite multi-step |
| `contextpack.cp_budget` | composite multi-step |
| `contextpack.cp_prioritize` | composite multi-step |
**composite stateful**
| `smartcontext.sctx_load` | composite stateful |
| `smartcontext.sctx_refresh` | composite stateful |
| `smartcontext.sctx_status` | composite stateful |
**trivial wrapper**
| `echo.echo_*` | trivial wrapper |
| `shell.sh_background` | trivial wrapper |
| `shell.sh_kill` | trivial wrapper |
| `shell.sh_compress` | trivial wrapper |
**trivial wrapper of Bash**
| `shell.sh_exec` | trivial wrapper of Bash |
**meta-bundle brick**
| `codebase.codebase_*` | meta-bundle brick |
| `codemod.codemod_*` | meta-bundle brick |
| `devtools.devtools_*` | meta-bundle brick |
| `filesystem.filesystem_*` | meta-bundle brick |
| `knowledgebase.knowledgebase_*` | meta-bundle brick |
**composite**
| `overview.ovw_architecture` | composite — requires multiple files + analysis |
| `overview.ovw_conventions` | composite — requires multiple files + analysis |
**AI-assisted review**
| `review.rev_code` | AI-assisted review |
| `review.rev_security` | AI-assisted review |
| `review.rev_architecture` | AI-assisted review |
| `review.rev_compare` | AI-assisted review |

## Notes

- **compress / format**: Native baseline = raw file content. The brick adds value via
  transformation. Delta reflects compression ratio vs. raw content, not discovery cost.
- **fts_***: Two-phase (index + search). Native baseline is grep (no ranking).
  The brick's value includes precision (TF-IDF ranked results), not just token reduction.
- **fr_read vs native Read**: Expected ~0% — both return full file content wrapped in JSON.
- **mr_batch / mr_dedup / mr_merge**: Native baseline concatenates raw text; brick wraps in JSON envelope.
  For large files the delta approaches 0%; for structured access the JSON format adds value.
- **refs_references**: Native reads 5 matching files in full to simulate what an agent would do.
- **filewrite / fileops / rename / codeedit / inline / filediff(patch)**: Write-side tools
  are measured using tmpdir copies so fixtures are never mutated. Output is a small status
  object vs. raw grep/find output used as native proxy — delta is biased toward 0%.
- **sem_intent / sem_embeddings**: No native LLM equivalent. Native baseline = trivial string.
  Delta reflects structural overhead only.
- **treesitter.***: Native = find(ts files) as proxy; brick builds a richer in-memory index.
- **routes.***: Native = grep for route patterns. Brick parses AST for structured route table.
- **Skipped categories** (174 tools): compute pure transforms, stateful multi-call
  (cache/memory/session/share), orchestration (parallel/dispatch/agent/autopilot/batch),
  meta-AI (planning/thinking/debate/decision/review), CLI meta (focus_*), VM (sandbox),
  observability (metrics/heatmap/savings/tokenbudget), API-bound (validate/lastversion),
  workflow/state (repos/task/research/onboarding/fullaudit),
  graph state (graphbuild/graphquery/graphcluster/graphexport/callgraph/depgraph),
  composite (contextpack/smartcontext), trivial wrappers (echo/shell), meta-bundles.
