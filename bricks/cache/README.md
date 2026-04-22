# @focus-mcp/cache

In-memory file cache for FocusMCP — avoids redundant disk reads with mtime-based invalidation.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `get` | `cache_get` | Get a file from cache (hit/miss) |
| `set` | `cache_set` | Force a file into the cache |
| `invalidate` | `cache_invalidate` | Invalidate one file or clear all |
| `warmup` | `cache_warmup` | Pre-load a list of files |
| `stats` | `cache_stats` | Cache metrics: entries, size, hit rate |
