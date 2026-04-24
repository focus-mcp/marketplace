# Fiche brick — onboarding

**Domaine** : Project onboarding workflow — auto-discover project structure, conventions, and key files for a new contributor or AI agent.
**Prefix** : `onb`
**Tools** : 2 (`scan`, `guide`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 707,373 | 165,952 | -76.5% |
| cache_creation | 27,437 | 15,045 | |
| cache_read | 675,712 | 149,565 | |
| output | 4,179 | 1,313 | |
| Turns (SDK) | 18 | 8 | |
| Duration (s) | 72.4 | 22.9 | -68% |

## Mini-task (iso)

You are onboarding to the NestJS monorepo located at `test-repo/`. Acting as a new contributor performing a project onboarding scan, inspect the project's commit-message convention configuration file (`test-repo/.commitlintrc.json`) and identify every allowed commit message **`type`** value enforced by the `type-enum` rule. Report the complete list in the exact order the values appear in the configuration file, one value per line (no extra commentary).

---

## Tool coverage (brick mode)

- `onb_scan` : not called ⚠️
- `onb_guide` : not called ⚠️

**Coverage score**: 0/2 tools used

## Answers comparison

**Native answer**: ```
  build
  chore
  ci
  docs
  feat
... (13 total)
```

**Brick answer**: —

**Match**: ? (missing)

## Observations

- Brick achieves Δ=-76.5% despite 0/2 coverage — the savings come primarily from reduced tool-definition footprint in the system prompt, not from the brick's tools being actively used. For this simple config-file read task (extract allowed commit types from `.commitlintrc.json`), the agent found alternative paths without invoking `onb_scan` or `onb_guide`.
- The brick answer is missing (`—`) suggesting the agent answered directly from the file without brick tools. Duration savings (-68%) are exceptional, indicating the reduced context significantly helped.
- Treat the token savings as "savings-from-context-reduction", not "onboarding scan provided project intelligence".

## Auto-detected issues

- Tools not called: `onb_scan`, `onb_guide`
- Turns > 15 (native): 18

## Recommendations

- 📝 Honest-framing for report: differentiate context-reduction savings from onboarding-scan value. Consider tasks requiring full project structure discovery (tech stack, conventions, entry points) to test the brick's real onboarding value.
- 📝 Capture the brick answer even when tools are bypassed — the agent answered correctly but the answer wasn't recorded.
