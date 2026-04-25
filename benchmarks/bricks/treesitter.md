# Fiche brick — treesitter

**Domaine** : Regex-based code indexer for TypeScript/JavaScript — parses symbols, imports, exports.
**Prefix** : `ts`
**Tools** : 5 (`index`, `reindex`, `status`, `cleanup`, `langs`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 460,556 | 766,028 | +66.3% ⚠️ |
| cache_creation | 30,977 | 38,243 | |
| cache_read | 426,486 | 720,149 | |
| output | 3,060 | 7,522 | |
| Turns (SDK) | 12 | 26 | |
| Duration (s) | 56.9 | 141.2 | +148% ⚠️ |

## Mini-task (iso)

Using the treesitter brick, index the directory `test-repo/packages/common/exceptions/` and then identify all exported class names defined in the TypeScript files within that directory. Return the list of class names sorted alphabetically, one per line. Do not include class names re-exported from other modules — only those directly declared with `export class` in a `.ts` file under that directory.

## Tool coverage (brick mode)

- `ts_index` : not called ⚠️
- `ts_reindex` : not called ⚠️
- `ts_status` : not called ⚠️
- `ts_cleanup` : not called ⚠️
- `ts_langs` : not called ⚠️

**Coverage score**: 0/5 tools used

## Answers comparison

**Native answer**: ```
  BadGatewayException
  BadRequestException
  ConflictException
  ForbiddenException
  GatewayTimeoutException
... (24 total)
```

**Brick answer**: Unable to complete — the treesitter brick could not be loaded; brick tools (`ts_index`, `ts_status`, etc.) were never registered

**Match**: divergent (manual check needed)

## Observations

- Brick is regressive: +66.3% tokens, +148% duration, 0/5 tool coverage. The `treesitter` brick could not be loaded (`@focus-mcp/brick-treesitter` npm package absent) — all overhead is from failed load attempts consuming 26 turns.
- This is a Cat C brick (known not to be measured in Phase 1 due to npm package absence). The regression entirely reflects load-failure overhead.

## Auto-detected issues

- Tools not called: `ts_index`, `ts_reindex`, `ts_status`, `ts_cleanup`, `ts_langs`
- Turns > 15 (brick): 26
- Brick notes flagged: failed — "The focus MCP server is present and functional for catalog/management operations, but `focus_load "treesitter"` consistently fails with `Cannot find module '@focus-mcp/brick-treesitter'` (require stac"
- Brick slower than native by 148% (UX concern)
- Brick uses MORE tokens than native (766,028 vs 460,556)

## Recommendations

- 🔧 Ensure `@focus-mcp/brick-treesitter` is published to npm and pre-installed in bench environment before re-running.
- 📝 Cat C brick — exclude from Phase 1 summary stats.
