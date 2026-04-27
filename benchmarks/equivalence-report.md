# Static Equivalence Report

Per-tool measurement. No LLM, no variance.
Token approximation: `Math.ceil(JSON.stringify(output).length / 4)`
Test fixture: `/home/samuelds/benchmarks/test-repo`
Date: 2026-04-27T08:16:30.318Z

## Full Results (sorted by Δ%, best first)

| Tool | Description | Native tokens | Brick tokens | Δ% |
|---|---|---:|---:|---:|
| `smartread.sr_summary` | Block summary of injector.ts | 8,522 | 20 | **-99.8%** |
| `refs.refs_hierarchy` | Class hierarchy of "Injector" in core | 2,678 | 7 | **-99.7%** |
| `smartread.sr_signatures` | Export signatures of injector.ts | 8,522 | 44 | **-99.5%** |
| `outline.out_repo` | Repo outline of core/injector (find + read each) | 23,712 | 436 | **-98.1%** |
| `smartread.sr_imports` | Import lines of injector.ts | 8,522 | 198 | **-97.6%** |
| `compress.cmp_terse` | Terse (identifiers only) of injector.ts | 8,522 | 233 | **-97.2%** |
| `outline.out_file` | Outline symbols/imports of injector.ts | 8,522 | 323 | **-96.1%** |
| `fts.fts_search` | FTS search "Injectable" after indexing core | 5,560 | 370 | **-93.3%** |
| `smartread.sr_map` | Symbol map of injector.ts | 8,522 | 1,292 | **-84.3%** |
| `outline.out_structure` | Directory structure of core package | 5,645 | 956 | **-82.9%** |
| `textsearch.txt_grouped` | Grouped search "Injectable" by file | 5,560 | 968 | **-82.4%** |
| `refs.refs_references` | All refs to "Injector" symbol in core | 12,930 | 2,261 | **-82.0%** |
| `overview.ovw_project` | Project metadata (package.json parse) | 2,415 | 716 | **-66.7%** |
| `textsearch.txt_search` | Search "Injectable" with context lines | 5,560 | 2,613 | **-52.6%** |
| `rename.ren_preview` | Preview rename "Injector" occurrences in core | 2,678 | 1,401 | **-47.3%** |
| `overview.ovw_dependencies` | Dependency list vs raw package.json | 2,415 | 1,182 | **-45.1%** |
| `filesearch.fsrch_search` | Search "Injectable" in core src | 5,560 | 3,055 | **-44.6%** |
| `refs.refs_declaration` | Declaration of "Injector" symbol in core | 63 | 40 | **-35.5%** |
| `compress.cmp_output` | Compress injector.ts (medium level) | 8,522 | 6,605 | **-19.9%** |
| `fileread.fr_tail` | Last 10 lines of injector.ts | 56 | 51 | **-3.8%** |
| `filelist.fl_glob` | Glob *.ts in core src | 5,645 | 5,713 | **+2.4%** |
| `filediff.fd_diff` | Diff two TS files (unified format) | 1,161 | 1,155 | **+2.7%** |
| `fileread.fr_read` | Full read of injector.ts (baseline: identical) | 8,522 | 8,525 | **+3.4%** |
| `multiread.mr_merge` | Merge 5 TS files with separators | 8,246 | 8,268 | **+3.5%** |
| `multiread.mr_batch` | Batch read 5 TS files | 8,246 | 8,331 | **+4.3%** |
| `fileread.fr_range` | Lines 100-150 of injector.ts (1110 total) | 360 | 375 | **+8.3%** |
| `format.fmt_json` | Format raw package.json (pretty-print) | 2,415 | 2,421 | **+12.4%** |
| `fileread.fr_head` | First 10 lines of injector.ts | 54 | 58 | **+15.4%** |
| `filelist.fl_list` | List entries of core/injector dir | 90 | 108 | **+27.6%** |

## Summary

| Metric | Value |
|---|---|
| Tools measured | 29 |
| Errors | 0 |
| Skipped | 0 |
| Average Δ% (all tools) | **-46.5%** |
| Total native tokens | 169,225 |
| Total brick tokens | 57,725 |
| Overall token savings | **65.9%** |

## Top 5 Token Savers

| Tool | Description | Native tokens | Brick tokens | Δ% |
|---|---|---:|---:|---:|
| `smartread.sr_summary` | Block summary of injector.ts | 8,522 | 20 | **-99.8%** |
| `refs.refs_hierarchy` | Class hierarchy of "Injector" in core | 2,678 | 7 | **-99.7%** |
| `smartread.sr_signatures` | Export signatures of injector.ts | 8,522 | 44 | **-99.5%** |
| `outline.out_repo` | Repo outline of core/injector (find + read each) | 23,712 | 436 | **-98.1%** |
| `smartread.sr_imports` | Import lines of injector.ts | 8,522 | 198 | **-97.6%** |

## Errors / Skipped

### Errors (0)

| Tool | Error |
|---|---|
| — | none |



## Notes

- **compress / format**: Native baseline = raw file content. The brick adds value via
  transformation. Delta reflects compression ratio vs. raw content, not discovery cost.
- **fts_search**: Two-phase (index + search). Native baseline is grep (no ranking).
  The brick's value includes precision (TF-IDF ranked results), not just token reduction.
- **fr_read vs native Read**: Expected ~0% — both return full file content wrapped in JSON.
- **mr_batch / mr_merge**: Native baseline concatenates raw text; brick wraps in JSON envelope.
  For large files the delta approaches 0%; for structured access the JSON format adds value.
- **refs_references**: Native reads 5 matching files in full to simulate what an agent would do.
