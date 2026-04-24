# Fiche brick — outline

**Domaine** : File and repo structure outline — list exported symbols and directory trees without reading full content.
**Prefix** : `out`
**Tools** : 3 (`file`, `repo`, `structure`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 656,547 | 133,757 | -79.6% |
| cache_creation | 52,328 | 16,034 | |
| cache_read | 599,756 | 115,043 | |
| output | 4,424 | 2,655 | |
| Turns (SDK) | 14 | 6 | |
| Duration (s) | 69.2 | 52.3 | -25% |

## Mini-task (iso)

Use the outline brick's `out__file` tool on the file `test-repo/packages/common/decorators/http/route-params.decorator.ts` (a NestJS HTTP parameter decorator source file) and list all **unique exported symbol names** found in that file. Symbols that appear multiple times (due to TypeScript function overloads) should be listed only once. Produce the result as an alphabetically sorted list of symbol names, one per line.

Expected answer format: alphabetically sorted list of unique exported symbol names, one per line, no line numbers or types — only the bare names.

---

## Tool coverage (brick mode)

- `out_file` : called ✓
- `out_repo` : not called ⚠️
- `out_structure` : not called ⚠️

**Coverage score**: 1/3 tools used

## Answers comparison

**Native answer**: ```
  assignMetadata
  Body
  Headers
  HostParam
  Ip
... (20 total)
```

**Brick answer**: ```
Body
Headers
HostParam
Ip
Next
... (18 total)
```

**Match**: divergent (manual check needed)

## Observations

- Strong token savings (Δ=-79.6%) and wall-clock improvement (-25%). Agent completed the task with 1/3 tools (`out_file`). Brick answer is partial: 18 symbols vs native's 20 — two symbols are missing. Gain in tokens may be partly misleading given the partial result.
- The `out_file` tool appears to have a default limit or misses certain TypeScript export kinds (e.g., overloaded function exports deduplicated differently than native).
- `out_repo` and `out_structure` are not called because the task is single-file scoped.

## Auto-detected issues

- Tools not called: `out_repo`, `out_structure`

## Recommendations

- 🔧 Audit `out_file` for edge cases in symbol extraction — function overloads, re-exports, and namespace declarations may be silently dropped.
- 📝 Mention partial-result risk in the brick description: token savings are genuine but completeness must be verified for exhaustive symbol enumeration tasks.
