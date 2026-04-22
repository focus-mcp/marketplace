# @focus-mcp/dispatch

Task dispatch queue — send tasks to an in-memory queue, cancel them, and check their status for multi-step workflow orchestration.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `send` | `dsp_send` | Send a task to the dispatch queue, returns a task ID |
| `queue` | `dsp_queue` | List all tasks, optionally filtered by status |
| `cancel` | `dsp_cancel` | Cancel a pending or running task by ID |
| `status` | `dsp_status` | Get full details of a specific task |

## Task statuses

| Status | Description |
|--------|-------------|
| `pending` | Task created, waiting to be processed |
| `running` | Task currently being processed |
| `done` | Task completed successfully |
| `cancelled` | Task was cancelled |

## Usage

```json
// Send a task
{ "type": "review", "payload": { "pr": 42 }, "priority": 8 }

// List pending tasks
{ "status": "pending" }

// Cancel a task
{ "id": "uuid-here" }

// Check status
{ "id": "uuid-here" }
```
