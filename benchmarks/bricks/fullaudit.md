# Fiche brick — fullaudit

**Domaine** : Full project audit workflow — code quality review, security scan, architecture analysis, and metrics report.
**Prefix** : `audit`
**Tools** : 2 (`run`, `report`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 794,852 | 97,484 | -87.7% |
| cache_creation | 29,153 | 10,237 | |
| cache_read | 759,357 | 86,444 | |
| output | 6,290 | 787 | |
| Turns (SDK) | 20 | 5 | |
| Duration (s) | 112.5 | 18.0 | -84% |

## Mini-task (iso)

Using the **fullaudit** brick, run a code quality audit on the NestJS monorepo package located at `test-repo/packages/core/`. Specifically, identify all TypeScript source files (i.e., files ending in `.ts` but **not** `.spec.ts`) within `test-repo/packages/core/` that contain at least one `as any` type assertion — a common code-quality flag in TypeScript audits indicating unsafe type bypassing.

List the matching file paths relative to `test-repo/` (i.e., starting with `packages/core/`), one path per line, sorted alphabetically. Do not include test/spec files in the output.

Expected answer format: a sorted list of file paths, one per line, each relative to `test-repo/` (e.g. `packages/core/scanner.ts`).

---

## Tool coverage (brick mode)

- `audit_run` : not called ⚠️
- `audit_report` : not called ⚠️

**Coverage score**: 0/2 tools used

## Answers comparison

**Native answer**: ```
packages/core/errors/messages.ts
packages/core/exceptions/base-exception-filter-context.ts
packages/core/exceptions/external-exception-filter-context.ts
packages/core/guards/guards-consumer.ts
packages/core/helpers/context-id-factory.ts
... (26 total)
```

**Brick answer**: —

**Match**: ? (missing)

## Observations

- Brick achieves Δ=-87.7% despite 0/2 coverage — the savings come primarily from reduced tool-definition footprint in the system prompt, not from the brick's tools being actively used. For this grep-style audit task (find `as any` occurrences), the agent used native search tools instead of `audit_run` or `audit_report`.
- The brick answer is missing (`—`) suggesting the agent answered directly without invoking brick tools. The strong savings (87.7%, -84% duration) are a proxy for "smaller system prompt context", not "audit tool provided algorithmic leverage".
- Treat savings as context-reduction savings, not domain-specific audit value.

## Auto-detected issues

- Tools not called: `audit_run`, `audit_report`
- Turns > 15 (native): 20

## Recommendations

- 📝 Honest-framing for report: differentiate "savings-from-context-reduction" from "savings-from-better-audit-tool". Consider tasks where `audit_run` must be invoked to produce a structured report the agent cannot reproduce manually.
- 📝 The missing brick answer should be captured — if the agent found the answer via fallback, record it for comparison.
