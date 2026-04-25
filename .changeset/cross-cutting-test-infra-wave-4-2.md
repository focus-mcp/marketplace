---
---

test(infra): Wave 4.2 integration tests — planning, thinking, debate, decision — no version bumps.
- planning: 4 scenarios (plan_create, plan_steps, plan_dependencies, plan_estimate) — stateful sequenced
- thinking: 5 scenarios (thk_think, thk_branch, thk_revise happy+invalid-index, thk_summarize)
- debate: 4 scenarios (dbt_debate, dbt_score, dbt_consensus, dbt_summary) — added resetDebates() @internal helper
- decision: 4 scenarios (dec_options, dec_tradeoffs, dec_recommend, dec_record)
- all 4 bricks: added test:integration script + @focus-mcp/marketplace-testing devDependency
