---
"@focus-mcp/brick-sandbox": patch
---

fix(sandbox): cap logs[], result, and content payloads (UTF-8 byte-safe truncation)

Resolves +42% token regression caught by Wave 4.4 integration tests:
- box_run/box_file logs[]: now capped at 256 lines × 1KB per line
- box_run result: capped at 4KB
- box_read content: capped at 16KB
- All truncation is UTF-8 byte-safe via Buffer + TextDecoder
