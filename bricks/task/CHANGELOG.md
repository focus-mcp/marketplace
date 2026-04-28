# @focus-mcp/brick-task

## 1.1.1

### Patch Changes

- 5cf82cd: test(integration): Wave 5.6a — add integration tests for metrics, repos, task, research bricks

  Covers 14 scenarios across 4 bricks: met_session/initial + non-empty adversarial, met_tokens/happy,
  met_costs/happy, met_duration/happy, repos_register/list/unregister/stats happy paths,
  tsk_create/assign/status/complete happy + tsk_complete/non-existent adversarial,
  rsh_multisource/synthesize/validate happy paths.

  All scenarios include outputSizeUnder(2048/4096/8192) guards. Smoking gun investigation:
  metrics +102% explained — output is a compact 6-field summary (never raw toolCalls[]).
  research +23% also cleared — output bounded by source count, no bloat.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
