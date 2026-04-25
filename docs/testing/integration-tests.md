<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Integration Tests — Authoring Guide

This guide explains how to add integration tests for a brick. It matches the
design in `docs/superpowers/specs/2026-04-24-integration-tests-design.md`.

## TL;DR

- Tests are **programmatic** (Vitest, direct handler calls). No LLM at test runtime.
- Per scenario: YAML + invariants + (optional) LLM-curated goldens.
- Test layers: **semantic invariants** (always run, human-written) + **golden comparison** (human-reviewed).
- The LLM is **never** the oracle. See spec §2.1 "Principle 0".

## Layout

```
bricks/<name>/tests/integration/
├── <tool>.test.ts                  # the Vitest entry
├── scenarios/<tool>/<name>/
│   ├── scenario.yaml               # tool + prompt + input
│   └── invariants.ts               # exports check(output): InvariantResult[]
├── goldens/<tool>/<name>/
│   ├── native.expected             # produced by curate-golden (or hand-written)
│   ├── brick.expected              # ditto
│   └── metrics.json                # tokens/turns/duration (bonus bench)
└── fixtures/synthetic/             # committed crafted inputs
```

## Authoring a new scenario

1. Decide on a single failure mode you want to catch. Write it as a comment on top of the scenario file.
2. Create `scenario.yaml` with the prompt, input, and fixture references.
3. Create `invariants.ts` that programmatically verifies the semantic property (2+ checks minimum).
4. Run `pnpm test:curate-golden -- --brick X --tool Y --scenario Z` (or hand-write goldens for deterministic cases). Review the produced files.
5. Reference the scenario from the tool's test file.
6. Run `pnpm --filter @focus-mcp/brick-X run test:integration` to confirm green.

## Invariants — the safety net

An invariant is a programmatic assertion of a property that must hold **regardless of the exact output**. Goldens guard against regression; invariants guard against the LLM producing a confidently-wrong golden in the first place.

Rule of thumb: for each scenario, write **at least 2 invariants that would fail if the bug you're guarding against were present**. If you can't, the scenario isn't useful.

Helpers in `@focus-mcp/marketplace-testing/invariants`:
- `outputHasField(output, field)`
- `fileSyntaxValid(path, language)`
- `insertedNearAnchor(input)`

Add more as needed under `packages/marketplace-testing/src/invariants/`.

## Goldens — LLM-curated, human-approved

`pnpm test:curate-golden` runs the scenario prompt through Claude Sonnet twice:
- `native` mode — agent has Bash/Read/Grep/Glob only
- `brick` mode — agent has the specific tool enabled

Output is written to `goldens/<tool>/<scenario>/brick.expected` etc. plus `metrics.json` with token/turn counts.

For deterministic cases (e.g. empty directory returns `{matches: []}`) you can hand-write the golden directly.

**The LLM draft is not authoritative.** Every golden lands in a PR for human review. A divergence between `native.expected` and `brick.expected` is a signal to investigate.

If a tool's output should change intentionally, re-run curate-golden and commit the diff. If CI fails because of a mismatch, do **not** blindly regenerate — inspect whether the brick actually regressed.

## No CI yet (Phase 0)

Tests run locally via `pnpm -r --filter "./bricks/**" run test:integration`. CI wiring comes in Phase 1 (advisory only) and Phase 2 (publish gate), after we've built confidence the framework is stable.

## Language scope

FocusMCP-official bricks support **every language by default** — no manifest declaration is needed.

External (third-party) bricks MAY declare `supportedLanguages: string[]` in their `mcp-brick.json` to opt in to scoping:

```json
{
  "supportedLanguages": ["typescript", "javascript"]
}
```

When the field is **present**, the test runner will skip fixture/language pairs whose primary language is not in the list.  
When the field is **absent** (the default for all official bricks), the test framework runs on every available fixture.

`supportedFrameworks` is **not** a recognised manifest field — do not add it.

## Phase A status (POC)

- ✅ `filelist` brick — fl_glob (happy + adversarial), fl_find (happy)
- ✅ `codeedit` brick — ce_insertafter (ambiguous-anchor invariant validated to catch wrong-location bug class), ce_replacebody (PHP single-line via php-parser AST)
- 🔍 Discovered bug: `flGlob` uses regex against `entry.name` only — `**/*.module.ts` does not recurse. Reported in PATCH_QUEUE.

Next: Phase B (add the `testMultiLanguage` helper; demonstrate opt-in scoping for external bricks).
