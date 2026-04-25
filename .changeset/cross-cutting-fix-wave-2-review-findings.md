---
---

test(infra): address Wave 2 review feedback — no version bumps.
- compress: guard JSON.parse in null-check IIFE with try/catch to avoid unhandled SyntaxError
- compress: fix inconvertible-type comparison in hasNullValue (remove redundant `&& value !== null` after object branch)
- savings: replace unchecked sessionId casts with runtime typeof guards that throw on missing field
- fts: export _resetFtsIndex and apply in beforeEach/afterEach for test isolation (consistent with fullaudit/savings pattern)
- fts/inline: add scenario.yaml across 9 scenarios (fts_index, fts_search x2, fts_rank, fts_suggest, inl_extract x2, inl_inline, inl_move)
