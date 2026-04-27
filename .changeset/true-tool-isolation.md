---
---

chore(bench/runner): true tool isolation in brick mode via SDK `tools: []` option

**Investigation findings (SDK v0.2.118):**

The Claude Agent SDK `Options` type exposes a `tools` field (line 1196 of `sdk.d.ts`):
- `tools: []` → passes `--tools ""` to the Claude CLI subprocess → disables ALL built-in tools
- `tools: ['Bash', 'Read']` → passes `--tools "Bash,Read"` → only those builtins
- `tools: { type: 'preset', preset: 'claude_code' }` → `--tools "default"` → full preset
- `tools: undefined` (previous behaviour) → no `--tools` flag → all builtins loaded

Source confirmation in `sdk.mjs`:
```
if(V6.length===0) l.push("--tools","");
else l.push("--tools",V6.join(","));
```

The previous `disallowedTools` blacklist approach was inherently fragile: tools like
`NotebookEdit`, `RemoteTrigger`, `TodoWrite`, `mcp__claude_ai_Context7__*` kept leaking
through on each SDK update (whack-a-mole).

**Solution:** brick mode now sets `tools: []` (zero builtins) + `allowedTools: [mcp__focus__*]`
(auto-permission for brick tools) + `disallowedTools: []` (no blacklist needed).

`BRICK_BUILTIN_TOOLS` is introduced as a documented reference list of all known SDK builtins.
`BRICK_DISALLOWED_TOOLS` is kept as an alias for backward compatibility with external consumers.
