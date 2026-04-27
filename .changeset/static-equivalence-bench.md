---
---

feat(bench): static equivalence measurement per-tool (no LLM, deterministic)

Measures the token cost of each brick's output vs the equivalent native operation
(Read, grep, find, etc.). Provides a reproducible baseline of brick value per call,
without the variance of LLM-based benchmarks.
