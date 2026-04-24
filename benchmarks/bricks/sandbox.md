# Fiche brick — sandbox

**Domaine** : Sandboxed code execution — run JavaScript/TypeScript snippets in an isolated VM context.
**Prefix** : `box`
**Tools** : 5 (`run`, `file`, `eval`, `languages`, `read`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 738,499 | 628,308 | -14.9% |
| cache_creation | 48,833 | 57,604 | |
| cache_read | 683,991 | 565,295 | |
| output | 5,632 | 5,309 | |
| Turns (SDK) | 16 | 20 | |
| Duration (s) | 94.0 | 93.0 | -1% |

## Mini-task (iso)

Using the sandbox brick, read the file `test-repo/packages/common/enums/route-paramtypes.enum.ts`, execute JavaScript code that extracts all enum member name-value pairs from the `RouteParamtypes` enum defined in that file, and return them sorted alphabetically. The expected answer is a list of `NAME=VALUE` entries (no spaces around `=`), one per line, sorted alphabetically by name (A–Z). Do not include the enum name, braces, or trailing commas — only the sorted member entries.

To solve this with the sandbox brick:
1. Use `box__read` with path `test-repo/packages/common/enums/route-paramtypes.enum.ts` to load the file contents.
2. Use `box__run` to execute a JavaScript snippet that applies a regex like `/^\s+(\w+)\s*=\s*(\d+)/gm` against the file string, collects all matches into `NAME=VALUE` pairs, sorts them alphabetically, and returns the joined result.

---

## Tool coverage (brick mode)

- `box_run` : not called ⚠️
- `box_file` : not called ⚠️
- `box_eval` : not called ⚠️
- `box_languages` : not called ⚠️
- `box_read` : not called ⚠️

**Coverage score**: 0/5 tools used

## Answers comparison

**Native answer**: ```
  ACK=13
  BODY=3
  FILE=8
  FILES=9
  HEADERS=6
... (15 total)
```

**Brick answer**: *(not obtained — brick tools unavailable; see Notes)*

**Match**: divergent (manual check needed)

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `box_run`, `box_file`, `box_eval`, `box_languages`, `box_read`
- Turns > 15 (brick): 20
- Turns > 15 (native): 16

## Recommendations

_(empty — to be filled after analysis)_
