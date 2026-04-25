---
"@focus-mcp/brick-onboarding": patch
"@focus-mcp/brick-lastversion": patch
"@focus-mcp/brick-shell": patch
---

test(integration): Wave 5.6b — add integration tests for onboarding, lastversion, shell bricks

Covers 12 scenarios across 3 bricks:
- onboarding: onb_scan/happy (structure discovered), onb_scan/empty-dir (adversarial, coherent
  output with keyFiles=[]), onb_guide/happy (sequenced scan+guide → markdown with expected sections)
- lastversion: lv_latest/happy (react@npm → semver), lv_versions/happy (lodash@npm → array+total),
  lv_check/happy (react@17.0.0 stale=true, bumpType=major). Skipped: lv_diff, lv_changelog,
  lv_audit — too flaky (GitHub rate limits, OSV advisory volatility)
- shell: sh_exec/happy (echo hello), sh_exec/non-zero-exit (adversarial, exitCode=1 no throw),
  sh_compress/happy (printf 3 lines), sh_background+sh_kill/happy (sequenced sleep+kill)

All packages updated with test:integration script and @focus-mcp/marketplace-testing devDependency.
All scenarios include outputSizeUnder guards.
