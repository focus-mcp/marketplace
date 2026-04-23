# @focusmcp/heatmap

File access heatmap — track read/write patterns, detect hot and cold files.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `track` | `hm_track` | Record a file access (read or write) with the current timestamp |
| `hotfiles` | `hm_hotfiles` | Return the most frequently accessed files |
| `patterns` | `hm_patterns` | Detect files commonly accessed together (within 1 second) |
| `coldfiles` | `hm_coldfiles` | Find files not accessed within a given time threshold |

## Usage

### track

Record that a file was read or written:

```json
{ "file": "/src/main.ts", "type": "read" }
```

Returns `{ file, totalAccesses }`.

### hotfiles

Get the top N most-accessed files, optionally filtered by type:

```json
{ "limit": 5, "type": "write" }
```

Returns `{ files: [{ file, count, lastAccess }] }`.

### patterns

Detect co-access patterns — pairs of files accessed within 1 second of each other:

```json
{}
```

Returns `{ coAccessed: [{ files, count }] }` sorted by frequency.

### coldfiles

Find files that have not been accessed recently:

```json
{ "threshold": 3600000 }
```

Default threshold is 3 600 000 ms (1 hour). Returns `{ files, count }`.
