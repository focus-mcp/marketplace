---
---

Cross-cutting docs + CI: switch the documented catalog URL from `raw.githubusercontent.com/focus-mcp/marketplace/main/publish/catalog.json` to `https://focus-mcp.github.io/marketplace/catalog.json` (gh-pages), which is auto-deployed by the `stable-publish` workflow on every release. The auto-commit-to-main step is removed (it never worked anyway — main's branch protection rejects bot pushes). No runtime change, no npm package bump.
