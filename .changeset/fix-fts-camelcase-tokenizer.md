---
"@focus-mcp/brick-fts": patch
---

fix(fts): split camelCase/PascalCase identifiers and index filenames

`tokenize()` now splits compound identifiers (PascalCase, camelCase, ACRONYM+Word) at case transitions while preserving the lowercase compound for exact matches. `ftsIndex()` now also indexes filename tokens, so a file like `DT_PurchasableRewardPools.json` is discoverable by name even when the identifier is absent from its content.
