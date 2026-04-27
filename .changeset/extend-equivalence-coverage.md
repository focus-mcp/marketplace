---
---

feat(bench): extend static equivalence coverage from 34 to 79 tools (32.5%)

Adds 45+ pairs covering file operations (filewrite, fileops, filelist fl_find/fl_tree),
code intelligence (symbol, refs_implementations, inline, impact, codeedit, treesitter),
search/text (textsearch txt_regex/txt_replace, filesearch fsrch_replace),
routes (rt_scan, rt_search, rt_list, rt_frameworks), fts (fts_index, fts_rank, fts_suggest),
filediff (fd_delta, fd_patch), multiread (mr_dedup), smartread (sr_full), and
semanticsearch (sem_search, sem_similar, sem_intent, sem_embeddings).
Skipped tools (174) — compute pure, stateful, orchestration, meta, graph-state, etc.
— listed in the report with explanation.
