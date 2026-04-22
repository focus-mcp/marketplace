# @focus-mcp/parallel

Parallel execution coordination — run tasks concurrently, collect results, merge outputs, handle timeouts.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `run` | `par_run` | Run multiple shell commands in parallel with concurrency control |
| `collect` | `par_collect` | Collect and aggregate results from a previous parallel run |
| `merge` | `par_merge` | Merge multiple text outputs into one, with separators and optional dedup |
| `timeout` | `par_timeout` | Set or check timeout configuration for parallel runs |

## Usage

### par_run

Run tasks in parallel, with optional concurrency limit and working directory:

```json
{
  "tasks": [
    { "id": "lint", "command": "pnpm lint" },
    { "id": "typecheck", "command": "pnpm typecheck" },
    { "id": "test", "command": "pnpm test" }
  ],
  "concurrency": 2,
  "cwd": "/path/to/project"
}
```

Returns `{ runId, taskCount, completed, failed }`.

### par_collect

Retrieve results from a previous `par_run` by its `runId`:

```json
{ "runId": "<uuid from par_run>" }
```

Returns `{ runId, results: [{ id, stdout, stderr, exitCode, duration, timedOut }], summary }`.

### par_merge

Merge text outputs with an optional separator and deduplication:

```json
{
  "outputs": [
    { "id": "a", "content": "line1\nline2" },
    { "id": "b", "content": "line3\nline2" }
  ],
  "separator": "---",
  "dedup": true
}
```

Returns `{ merged, lineCount }`.

### par_timeout

Configure or inspect timeout state:

```json
{ "defaultMs": 10000 }
```

Or check which tasks timed out in a run:

```json
{ "runId": "<uuid from par_run>" }
```

Returns `{ defaultMs, timedOut? }`.
