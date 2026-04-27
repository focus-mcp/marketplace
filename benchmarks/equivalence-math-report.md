# Equivalence Math Model — Break-even Analysis

Source data: `equivalence-report.md` (static equivalence, 29 tools).
Model: `Cost_brick(N) = M + D + N × (E + O_brick)`; `Cost_native(N) = N × O_native`.
Envelope constant: E = 50 tokens (JSON-RPC overhead per call).

## Break-even table

| Tool | M+D | Δ marginal/call | Break-even N* | Saved @ 10 calls | @ 100 | @ 1000 | Category |
|---|---:|---:|---:|---:|---:|---:|---|
| `outline.out_repo` | 337 | −23,226 | **0.01** | +231,923 | +2,322,263 | +23,225,663 | always wins |
| `refs.refs_references` | 434 | −10,619 | **0.04** | +105,756 | +1,061,466 | +10,618,566 | always wins |
| `smartread.sr_summary` | 365 | −8,452 | **0.04** | +84,155 | +844,835 | +8,451,635 | always wins |
| `smartread.sr_signatures` | 363 | −8,428 | **0.04** | +83,917 | +842,437 | +8,427,637 | always wins |
| `smartread.sr_imports` | 361 | −8,274 | **0.04** | +82,379 | +827,039 | +8,273,639 | always wins |
| `compress.cmp_terse` | 356 | −8,239 | **0.04** | +82,034 | +823,544 | +8,238,644 | always wins |
| `outline.out_file` | 343 | −8,149 | **0.04** | +81,147 | +814,557 | +8,148,657 | always wins |
| `smartread.sr_map` | 367 | −7,180 | **0.05** | +71,433 | +717,633 | +7,179,633 | always wins |
| `fts.fts_search` | 477 | −5,140 | **0.09** | +50,923 | +513,523 | +5,139,523 | always wins |
| `outline.out_structure` | 337 | −4,639 | **0.07** | +46,053 | +463,563 | +4,638,663 | always wins |
| `textsearch.txt_grouped` | 697 | −4,542 | **0.15** | +44,723 | +453,503 | +4,541,303 | always wins |
| `textsearch.txt_search` | 708 | −2,897 | **0.24** | +28,262 | +288,992 | +2,896,292 | always wins |
| `refs.refs_hierarchy` | 430 | −2,621 | **0.16** | +25,780 | +261,670 | +2,620,570 | always wins |
| `filesearch.fsrch_search` | 270 | −2,455 | **0.11** | +24,280 | +245,230 | +2,454,730 | always wins |
| `compress.cmp_output` | 351 | −1,867 | **0.19** | +18,319 | +186,349 | +1,866,649 | always wins |
| `overview.ovw_project` | 441 | −1,649 | **0.27** | +16,049 | +164,459 | +1,648,559 | always wins |
| `rename.ren_preview` | 594 | −1,227 | **0.48** | +11,676 | +122,106 | +1,226,406 | always wins |
| `overview.ovw_dependencies` | 442 | −1,183 | **0.37** | +11,388 | +117,858 | +1,182,558 | always wins |
| `refs.refs_declaration` | 431 | **−27 (overhead)** | ∞ | -701 | -3,131 | -27,431 | never wins |
| `filediff.fd_diff` | 290 | **−44 (overhead)** | ∞ | -730 | -4,690 | -44,290 | never wins |
| `fileread.fr_tail` | 356 | **−45 (overhead)** | ∞ | -806 | -4,856 | -45,356 | never wins |
| `fileread.fr_read` | 355 | **−53 (overhead)** | ∞ | -885 | -5,655 | -53,355 | never wins |
| `fileread.fr_head` | 356 | **−54 (overhead)** | ∞ | -896 | -5,756 | -54,356 | never wins |
| `format.fmt_json` | 520 | **−56 (overhead)** | ∞ | -1,080 | -6,120 | -56,520 | never wins |
| `fileread.fr_range` | 358 | **−65 (overhead)** | ∞ | -1,008 | -6,858 | -65,358 | never wins |
| `filelist.fl_list` | 339 | **−68 (overhead)** | ∞ | -1,019 | -7,139 | -68,339 | never wins |
| `multiread.mr_merge` | 296 | **−72 (overhead)** | ∞ | -1,016 | -7,496 | -72,296 | never wins |
| `filelist.fl_glob` | 339 | **−118 (overhead)** | ∞ | -1,519 | -12,139 | -118,339 | never wins |
| `multiread.mr_batch` | 293 | **−135 (overhead)** | ∞ | -1,643 | -13,793 | -135,293 | never wins |

> **M** = manifest size in tokens. **D** = tool description tokens. **Δ marginal** = tokens saved per additional call (positive = saves). **Break-even N*** = number of calls to amortize fixed cost.

## Categories summary

- **Always wins** (N* < 1) : 18 tools — profit from the very first call
- **Wins fast** (N* ≤ 10) : 0 tools — profitable after a handful of calls
- **Wins eventually** (N* ≤ 100) : 0 tools — profitable for regular use
- **Never wins** (Δ ≤ 0 or N* > 100) : 11 tools — pure overhead (compute, format, echo)

## Projections globales

Sur une session typique de **50 appels brick variés** (mix top-quartile bricks) :
- Total tokens native : ~403,101
- Total tokens brick : ~78,413
- Économie : 324,688 tokens (80.5%)

## Tools à éviter en single-shot

(catégorie "never wins" ou "wins eventually" — overhead ou amortissement tardif)

| Tool | Reason |
|---|---|
| `multiread.mr_batch` | No token reduction vs native (overhead) |
| `filelist.fl_glob` | No token reduction vs native (overhead) |
| `multiread.mr_merge` | No token reduction vs native (overhead) |
| `filelist.fl_list` | No token reduction vs native (overhead) |
| `fileread.fr_range` | No token reduction vs native (overhead) |
| `format.fmt_json` | No token reduction vs native (overhead) |
| `fileread.fr_head` | No token reduction vs native (overhead) |
| `fileread.fr_read` | No token reduction vs native (overhead) |
| `fileread.fr_tail` | No token reduction vs native (overhead) |
| `filediff.fd_diff` | No token reduction vs native (overhead) |
| `refs.refs_declaration` | No token reduction vs native (overhead) |

## Tools à privilégier dès N=1

(top "always wins" — profit immédiat, Δ/call le plus élevé)

| Tool | Δ/call | Use case |
|---|---:|---|
| `outline.out_repo` | −23,226 | Repo outline of core/injector (find + read each) |
| `refs.refs_references` | −10,619 | All refs to "Injector" symbol in core |
| `smartread.sr_summary` | −8,452 | Block summary of injector.ts |
| `smartread.sr_signatures` | −8,428 | Export signatures of injector.ts |
| `smartread.sr_imports` | −8,274 | Import lines of injector.ts |
| `compress.cmp_terse` | −8,239 | Terse (identifiers only) of injector.ts |
| `outline.out_file` | −8,149 | Outline symbols/imports of injector.ts |
| `smartread.sr_map` | −7,180 | Symbol map of injector.ts |
| `fts.fts_search` | −5,140 | FTS search "Injectable" after indexing core |
| `outline.out_structure` | −4,639 | Directory structure of core package |

## Top 5 — always wins

| Tool | Δ/call | Use case |
|---|---:|---|
| `outline.out_repo` | −23,226 | Repo outline of core/injector (find + read each) |
| `refs.refs_references` | −10,619 | All refs to "Injector" symbol in core |
| `smartread.sr_summary` | −8,452 | Block summary of injector.ts |
| `smartread.sr_signatures` | −8,428 | Export signatures of injector.ts |
| `smartread.sr_imports` | −8,274 | Import lines of injector.ts |

## Bottom 5 — never wins

| Tool | Reason |
|---|---|
| `multiread.mr_batch` | Overhead: brick adds 135 tokens/call |
| `filelist.fl_glob` | Overhead: brick adds 118 tokens/call |
| `multiread.mr_merge` | Overhead: brick adds 72 tokens/call |
| `filelist.fl_list` | Overhead: brick adds 68 tokens/call |
| `fileread.fr_range` | Overhead: brick adds 65 tokens/call |
