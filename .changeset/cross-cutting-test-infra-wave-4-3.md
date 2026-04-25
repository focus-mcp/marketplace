---
---

test(infra): Wave 4.3 integration tests — agent, dispatch, autopilot, batch, parallel — no version bumps.
- agent: 4 scenarios (agt_register, agt_unregister, agt_list, agt_capabilities) — stateful sequenced
- dispatch: 5 scenarios (dsp_send, dsp_queue, dsp_cancel, dsp_status/happy, dsp_status/non-existent adversarial)
- autopilot: 3 scenarios (auto_plan, auto_execute, auto_status) — no shell IO, pure state machine
- batch: 4 scenarios (bat_multi, bat_sequential, bat_parallel, bat_pipeline) — stateless, echo commands only
- parallel: 4 scenarios (par_run, par_collect, par_merge, par_timeout) — outputSizeUnder(2048) on all scenarios (smoking gun +79% flag)
- all 5 bricks: added test:integration script + @focus-mcp/marketplace-testing devDependency
- benchmarks/PATCH_QUEUE.md: parallel +79% smoking gun flagged with detail on full results stored in runs Map
