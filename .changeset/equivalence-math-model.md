---
---

feat(bench): math model — break-even and projections per tool

Builds on static equivalence data to compute:
- N* (break-even number of calls per tool)
- Δ marginal (savings per additional call)
- Savings projections at N = 10, 100, 1000 calls
- Category classification (always wins / wins fast / never wins)

Provides actionable guidance: "use this brick when you do X+ calls".
