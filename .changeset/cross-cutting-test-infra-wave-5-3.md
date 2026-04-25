---
---

Add Wave 5.3 integration tests for multiread, textsearch, semanticsearch, and smartcontext bricks.
- multiread: 4 scenarios (mr_batch/happy, mr_batch/non-existent adversarial, mr_dedup/happy, mr_merge/happy)
- textsearch: 4 scenarios (txt_search/happy, txt_regex/happy, txt_replace/happy with sandbox mutation, txt_grouped/happy)
- semanticsearch: 4 scenarios (sem_search/happy, sem_similar/happy, sem_intent/happy, sem_embeddings/happy with vector shape checks)
- smartcontext: 3 scenarios (sctx_load/happy, sctx_refresh/happy sequenced, sctx_status/happy) — uses mocked bus (composite brick)
- all 4 bricks: added test:integration script + @focus-mcp/marketplace-testing devDependency
