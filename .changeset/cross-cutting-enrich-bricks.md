---
---

Cross-cutting: Add `keywords` and `recommendedFor` metadata to 58 brick manifests for catalog discoverability. No runtime change, no npm package bump.

Justification: keywords are consumed by `scripts/build-catalog.ts` which generates `publish/catalog.json` (hosted catalog). Agents query the hosted catalog via `focus_bricks_search`, not individual npm packages. Therefore no per-brick patch bump is needed — the next catalog rebuild at release picks up the new metadata.
