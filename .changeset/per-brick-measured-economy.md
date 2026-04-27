---
---

docs(bricks): add measured economy section to per-brick READMEs

For 14 bricks measured in `benchmarks/equivalence-report.md`, each README now
shows the static benchmark numbers (native vs brick output, % savings).
Optional `bench` field in mcp-brick.json exposes the same data programmatically
for catalog consumers (field is ignored by build-catalog, schema unaffected).
