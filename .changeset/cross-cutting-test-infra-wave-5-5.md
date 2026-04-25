---
---

Add Wave 5.5 integration tests for contextpack, tokenbudget, and heatmap bricks.
- contextpack: 4 scenarios (cp_pack/happy 3-file bundle, cp_budget/happy fit in 5000 tokens, cp_estimate/happy token count, cp_prioritize/happy "testing" query ranks testing/index.ts first)
- tokenbudget: 4 scenarios (tb_estimate/happy text string, tb_analyze/happy fixtures/nestjs dir, tb_fill/happy budget=5000 + files, tb_optimize/happy budget=5000 + dir with mode assignments)
- heatmap: 5 scenarios (hm_track/happy single access, hm_hotfiles/happy 3× same file → count=3, hm_hotfiles/empty-state adversarial → empty array, hm_patterns/happy co-access within 1s window, hm_coldfiles/happy threshold=0 → file is cold)
- heatmap: resetHeatmap() used in beforeEach/afterEach for full state isolation
- all 3 bricks: added test:integration script + @focus-mcp/marketplace-testing devDependency
