# @focusmcp/multiread

Batch file reading for FocusMCP — multiple files in one call, deduplication, merge.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `batch` | `mr_batch` | Read multiple files in one call |
| `dedup` | `mr_dedup` | Read multiple files, deduplicate shared imports/headers |
| `merge` | `mr_merge` | Read and concatenate files with separators |
