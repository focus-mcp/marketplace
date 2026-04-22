# @focus-mcp/memory

Persistent key-value memory — store and recall information across sessions as JSON files in `~/.focus/memory/`.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `store` | `mem_store` | Save a key-value pair to persistent memory |
| `recall` | `mem_recall` | Get a value by key |
| `search` | `mem_search` | Search memories by substring match |
| `forget` | `mem_forget` | Delete a memory entry |
| `list` | `mem_list` | List all memory keys |
