# @focusmcp/session

Session context save and restore — track loaded files and operations, persist sessions to disk at `~/.focus/sessions/`.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `save` | `ses_save` | Save current session state to disk |
| `restore` | `ses_restore` | Restore a saved session |
| `context` | `ses_context` | Get current in-memory session summary |
| `history` | `ses_history` | List all saved sessions |
