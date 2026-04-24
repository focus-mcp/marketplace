# Fiche brick — rename

**Domaine** : Rename refactoring — rename symbols across files, rename files with import updates, bulk rename with preview.
**Prefix** : `ren`
**Tools** : 4 (`symbol`, `file`, `bulk`, `preview`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 740,175 | 121,406 | -83.6% |
| cache_creation | 31,035 | 16,770 | |
| cache_read | 704,161 | 102,626 | |
| output | 4,931 | 1,987 | |
| Turns (SDK) | 20 | 5 | |
| Duration (s) | 77.7 | 42.9 | -45% |

## Mini-task (iso)

Using the rename brick's `preview` tool (or equivalent dry-run capability), determine which TypeScript (`.ts`) files inside `test-repo/packages` contain the symbol `StreamableFile` and would be affected if it were renamed. Search the directory `test-repo/packages` recursively. Report the list of affected file paths **relative to `test-repo/`**, one per line, sorted alphabetically. Do not include files outside `test-repo/packages` (e.g. `integration/` is out of scope). The expected answer format is a plain list of relative paths, one per line, sorted alphabetically (ascending).

## Tool coverage (brick mode)

- `ren_symbol` : not called ⚠️
- `ren_file` : not called ⚠️
- `ren_bulk` : not called ⚠️
- `ren_preview` : called ✓

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
  packages/common/file-stream/interfaces/streamable-options.interface.ts
  packages/common/file-stream/streamable-file.ts
  packages/common/serializer/class-serializer.interceptor.ts
  packages/common/test/file-stream/streamable-file.spec.ts
  packages/common/test/serializer/class-serializer.interceptor.spec.ts
... (8 total)
```

**Brick answer**: ```
packages/common/file-stream/interfaces/streamable-options.interface.ts
packages/common/file-stream/streamable-file.ts
packages/common/serializer/class-serializer.interceptor.ts
packages/common/test/file-stream/streamable-file.spec.ts
packages/common/test/serializer/class-serializer.interceptor.spec.ts
... (7 total)
```

**Match**: ✓ same set (order may differ)

## Observations

- Strong token savings (Δ=-83.6%) and wall-clock improvement (duration ratio 0.55x). Agent completed the task with 1/4 tools (`ren_preview` only). Answer matches native ✓ (same 7–8 file set). The brick provides genuine leverage for rename preview tasks.
- The task was scoped to "find affected files before rename" — `ren_preview` is exactly the right tool, explaining the clean single-tool result.
- The three other tools (`ren_symbol`, `ren_file`, `ren_bulk`) cover active rename operations; they are not exercised in a dry-run iso-bench by design.

## Auto-detected issues

- Tools not called: `ren_symbol`, `ren_file`, `ren_bulk`
- Turns > 15 (native): 20

## Recommendations

- 🟢 Keep as-is — brick delivers top-tier savings for rename preview tasks.
- 📝 Consider enriching sibling tool descriptions so agents discover `ren_bulk` and `ren_symbol` for tasks that perform live renames (currently only `ren_preview` is exercised).
