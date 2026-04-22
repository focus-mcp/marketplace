# @focus-mcp/batch

Batch execution patterns — run multiple operations sequentially, in parallel, or as a pipeline.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `multi` | `bat_multi` | Execute multiple commands independently and collect all results |
| `sequential` | `bat_sequential` | Execute commands one by one, stopping on first failure (unless `continueOnError`) |
| `parallel` | `bat_parallel` | Execute all commands in parallel with optional concurrency limit |
| `pipeline` | `bat_pipeline` | Pipe stdout of each command into stdin of the next |
