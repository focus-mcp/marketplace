# @focus-mcp/brick-lastversion

## 1.2.2

### Patch Changes

- ccb209c: fix(lastversion): cap verbose outputs (versions/changelog/diff/audit) to bound payload

  Resolves +392% tokens / +99% latency Phase 2a regression:

  - lv_versions: default to last 20 versions (override via limit param, was 50)
  - lv_changelog: cap release bodies at 8KB total (UTF-8-byte-safe, spread across entries)
  - lv_audit: top 10 entries by severity DESC, count preserved in response
  - truncateBytes helper: Buffer + TextDecoder — safe on 4-byte Unicode (emojis etc.)

- 5916279: test(integration): Wave 5.6b — add integration tests for onboarding, lastversion, shell bricks

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

## 1.2.0

### Minor Changes

- lastversion: fix handler registration so tools actually dispatch (was throwing "No handler registered" on every call).
  sandbox: add TypeScript transpile (esbuild) and controlled box_read(path) tool — makes the brick actually usable on a codebase.

## 1.1.0

### Minor Changes

- Rebuild bricks with dist/ (PR #48). Fixes Node type-strip crash in node_modules and npm-layout resolution (PR focus-mcp/cli#38).
