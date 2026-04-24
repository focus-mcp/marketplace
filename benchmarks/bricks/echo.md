# Fiche brick — echo

**Domaine** : Hello-world brick — returns the message it receives. Serves as a smoke test for the FocusMCP pipeline.
**Prefix** : `echo`
**Tools** : 1 (`say`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 290,555 | 201,092 | -30.8% |
| cache_creation | 17,154 | 32,137 | |
| cache_read | 271,089 | 166,528 | |
| output | 2,288 | 2,398 | |
| Turns (SDK) | 8 | 7 | |
| Duration (s) | 61.4 | 49.6 | -19% |

## Mini-task (iso)

Read the `test-repo/package.json` file and extract the value of the top-level `"description"` field. Then call the `mcp__focus__echo__say` tool with that exact string as the `message` argument. Report the value that the tool returns.

Expected answer format: the echoed string returned by the `say` tool, exactly as returned (a single line of text, no quotes, no extra formatting).

---

## Tool coverage (brick mode)

- `echo_say` : called ✓

**Coverage score**: 1/1 tools used

## Answers comparison

**Native answer**: `Modern, fast, powerful node.js web framework`

**Brick answer**: Modern, fast, powerful node.js web framework

**Match**: divergent (manual check needed)

## Observations

- Smoke-test brick. 1/1 tool coverage (perfect). Modest savings (Δ=-30.8%) attributable solely to reduced system-prompt footprint — the brick has only one trivial tool. Answer matches native ✓ (auto-detected as "divergent" due to quote formatting only, not content).
- No algorithmic leverage expected or intended; the savings confirm that even a minimal brick reduces baseline system-prompt overhead.

## Auto-detected issues

_None detected_

## Recommendations

- 🟢 Keep as-is — echo brick serves its purpose as a pipeline smoke test.
- 📝 The "divergent" auto-detection flag is a false positive (string with/without quotes) — consider tightening the answer comparison to strip surrounding quotes.
