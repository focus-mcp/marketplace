---
"@focus-mcp/brick-lastversion": patch
---

fix(lastversion): cap verbose outputs (versions/changelog/diff/audit) to bound payload

Resolves +392% tokens / +99% latency Phase 2a regression:
- lv_versions: default to last 20 versions (override via limit param, was 50)
- lv_changelog: cap release bodies at 8KB total (UTF-8-byte-safe, spread across entries)
- lv_audit: top 10 entries by severity DESC, count preserved in response
- truncateBytes helper: Buffer + TextDecoder — safe on 4-byte Unicode (emojis etc.)
