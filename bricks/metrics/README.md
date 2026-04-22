# @focus-mcp/metrics

Session metrics tracking — token usage, costs, duration, and per-tool statistics.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `session` | `met_session` | Get or reset session metrics summary |
| `tokens` | `met_tokens` | Track token usage — record input/output tokens per tool call |
| `costs` | `met_costs` | Calculate estimated costs based on token usage and model pricing |
| `duration` | `met_duration` | Track and report tool call durations |

## Usage

### session

Returns a summary of the current session: start time, number of tool calls, total tokens, and total duration.
Pass `reset: true` to wipe all accumulated metrics and start fresh.

### tokens

Records a tool call with its input and output token counts. Returns cumulative totals.

```json
{ "tool": "search", "inputTokens": 1200, "outputTokens": 350 }
```

### costs

Estimates cost in USD based on recorded tokens. Defaults: `$0.003 / 1k input`, `$0.015 / 1k output`.

```json
{ "inputPricePer1k": 0.003, "outputPricePer1k": 0.015 }
```

### duration

Returns `avg`, `min`, `max`, and `calls` for durations. Filter by `tool` name or retrieve the `last` N calls.

```json
{ "tool": "search" }
{ "last": 10 }
```
