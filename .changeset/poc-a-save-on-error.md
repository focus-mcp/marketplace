---
---

chore(bench): runner saves partial result on SDK exception (try/finally)

Avoids data-loss when Claude SDK throws mid-stream (timeout, malformed response, etc.).
The result file is now always written with `exit_reason='error'` and the exception
message captured in `focus_stderr` for post-mortem debugging.
