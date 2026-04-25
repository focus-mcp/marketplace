---
---

test(infra): Wave 4.4 integration tests — sandbox — no version bumps.
- sandbox: 6 scenarios (box_run/happy, box_run/syntax-error, box_eval/happy, box_languages/happy, box_read/happy, box_file/happy)
- all 6 scenarios: outputSizeUnder(2048) to catch +42% smoking gun (logs array uncapped, result/content no size limit)
- sandbox is stateless (fresh vm.createContext per call) — no resetSandbox() needed
- VM isolation confirmed: vm.createContext with explicit whitelist, no process/require/fs/global
- benchmarks/PATCH_QUEUE.md: sandbox +42% smoking gun flagged with detail on logs[] cap missing and boxRead content uncapped
- brick-sandbox: added test:integration script + @focus-mcp/marketplace-testing devDependency
