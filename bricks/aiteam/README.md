# @focusmcp/aiteam

Composite AI team coordination brick for FocusMCP — loads all multi-agent orchestration sub-bricks.

This is a **composite brick**: it depends on `dispatch`, `parallel`, `debate`, `review`, and `agent`.
It exposes no tools of its own — the runtime loads and registers all sub-bricks automatically.

## Dependencies

| Brick | Description |
|-------|-------------|
| `dispatch` | Route tasks to the appropriate agent |
| `parallel` | Run multiple agents in parallel |
| `debate` | Structured debate between agents |
| `review` | Peer review of agent outputs |
| `agent` | Generic agent invocation |
