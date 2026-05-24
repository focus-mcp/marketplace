---
---

Cross-cutting CI: enable `--provenance` via `NPM_CONFIG_PROVENANCE=true` on both `stable-publish` and `dev-publish` workflows so npm picks up the Trusted Publisher OIDC token instead of relying on the (now invalid) `NPM_TOKEN` secret. No runtime change, no npm package bump.
