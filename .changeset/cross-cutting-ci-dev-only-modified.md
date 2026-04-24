---
---

ci(dev-publish): publish only bricks modified in the commit (stop 68x noise)

Use `git diff --name-only before...after -- 'bricks/*/'` to detect which bricks were
actually touched in the pushed commit. Only those bricks get a dev version bump, build,
and `npm publish --tag dev`. Falls back to publishing all bricks on first push, force-push,
or manual workflow_dispatch (catch-up mode).
