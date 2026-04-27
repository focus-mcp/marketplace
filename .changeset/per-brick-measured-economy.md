---
"@focus-mcp/brick-compress": patch
"@focus-mcp/brick-filediff": patch
"@focus-mcp/brick-filelist": patch
"@focus-mcp/brick-fileread": patch
"@focus-mcp/brick-filesearch": patch
"@focus-mcp/brick-format": patch
"@focus-mcp/brick-fts": patch
"@focus-mcp/brick-multiread": patch
"@focus-mcp/brick-outline": patch
"@focus-mcp/brick-overview": patch
"@focus-mcp/brick-refs": patch
"@focus-mcp/brick-rename": patch
"@focus-mcp/brick-smartread": patch
"@focus-mcp/brick-textsearch": patch
---

docs(bricks): add measured economy section to per-brick READMEs

For 14 bricks measured in `benchmarks/equivalence-report.md`, each README now
shows the static benchmark numbers (native vs brick output, % savings).
Optional `bench` field in mcp-brick.json exposes the same data programmatically
for catalog consumers (field is ignored by build-catalog, schema unaffected).
