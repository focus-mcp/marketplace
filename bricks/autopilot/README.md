# @focusmcp/autopilot

Autopilot workflow — autonomous task execution with reasoning, context management, and shell commands.

## Dependencies

- `codebase` — codebase exploration and file reading
- `smartcontext` — context loading and token budget management
- `devtools` — shell commands and developer tooling
- `thinking` — step-by-step reasoning

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `plan` | `auto_plan` | Create an execution plan for a task — break it into steps with reasoning |
| `execute` | `auto_execute` | Execute a plan step by step with reasoning at each stage |
| `status` | `auto_status` | Get autopilot status — current plan, completed steps, next step |

## Usage

### 1. Create a plan

```json
{
  "tool": "auto_plan",
  "arguments": {
    "task": "Implement JWT authentication for the API",
    "dir": "/project"
  }
}
```

Response:

```json
{
  "planId": "550e8400-e29b-41d4-a716-446655440000",
  "task": "Implement JWT authentication for the API",
  "steps": [
    { "title": "Analyze task and gather context", "reasoning": "...", "status": "pending" },
    { "title": "Implement the required changes", "reasoning": "...", "status": "pending" },
    { "title": "Test and verify", "reasoning": "...", "status": "pending" },
    { "title": "Review and summarise", "reasoning": "...", "status": "pending" }
  ]
}
```

### 2. Execute steps

```json
{
  "tool": "auto_execute",
  "arguments": {
    "planId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Omit `step` to execute the next pending step automatically.

### 3. Check status

```json
{
  "tool": "auto_status",
  "arguments": {
    "planId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Response:

```json
{
  "planId": "550e8400-e29b-41d4-a716-446655440000",
  "task": "Implement JWT authentication for the API",
  "totalSteps": 4,
  "completed": 2,
  "current": null,
  "nextStep": 2
}
```
