# @focus-mcp/agent

Agent registry — register AI agents with capabilities, list available agents, query capabilities.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `register` | `agt_register` | Register an agent with name, capabilities list, and optional metadata |
| `unregister` | `agt_unregister` | Remove an agent from the registry by ID |
| `list` | `agt_list` | List all registered agents, optionally filtered by capability |
| `capabilities` | `agt_capabilities` | Query which agents can handle a specific capability/task type |
