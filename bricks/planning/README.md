# @focusmcp/planning

Structured planning — create plans with steps, dependencies, and time estimates.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `create` | `plan_create` | Create a new plan with a title and optional description |
| `steps` | `plan_steps` | Add steps, mark steps complete, or list current steps |
| `dependencies` | `plan_dependencies` | Define dependencies between steps (step B depends on step A) |
| `estimate` | `plan_estimate` | Get a plan summary — total, completed, blocked, estimated time remaining |

## Time estimate format

The `estimate` field on each step accepts:
- `30m` — 30 minutes
- `2h` — 2 hours (120 minutes)
- `1d` — 1 day (480 minutes / 8h)
