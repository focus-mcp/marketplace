---
---

Cross-cutting CI: `stable-publish` workflow now auto-commits the refreshed `publish/catalog.json` back to `main` after a successful release. Previously the file was regenerated in CI and deployed to gh-pages, but never committed — so the catalog served via `raw.githubusercontent.com/.../main/publish/catalog.json` (the URL documented in AGENTS.md / README.md / docs/RELEASE.md) was permanently stale. The new step uses `git push origin HEAD:main` with the github-actions[bot] identity and `[skip ci]` to prevent re-triggering the workflow. No runtime change, no npm package bump.
