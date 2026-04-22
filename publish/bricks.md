# FocusMCP Bricks Catalog

> Auto-generated from `mcp-brick.json` manifests. Do not edit manually.
> Generated: 2026-04-21

## Summary

| Brick | Prefix | Tools | Type |
|-------|--------|-------|------|
| cache | `cache` | 5 | atomic |
| callgraph | `cg` | 4 | atomic |
| compress | `cmp` | 3 | atomic |
| depgraph | `dep` | 5 | atomic |
| echo | `echo` | 1 | atomic |
| filediff | `fd` | 3 | atomic |
| filelist | `fl` | 4 | atomic |
| fileops | `fo` | 4 | atomic |
| fileread | `fr` | 4 | atomic |
| filesearch | `fsrch` | 2 | atomic |
| filesystem | `fs` | 0 | composite |
| filewrite | `fw` | 3 | atomic |
| memory | `mem` | 5 | atomic |
| multiread | `mr` | 3 | atomic |
| outline | `out` | 3 | atomic |
| overview | `ovw` | 4 | atomic |
| refs | `refs` | 4 | atomic |
| session | `ses` | 4 | atomic |
| smartcontext | `sctx` | 3 | composite |
| smartread | `sr` | 5 | atomic |
| symbol | `sym` | 4 | atomic |
| tokenbudget | `tb` | 4 | atomic |
| treesitter | `ts` | 5 | atomic |

## Bricks

### cache

> In-memory file cache — avoid redundant disk reads with mtime-based invalidation.

- **Prefix**: `cache`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `cache_get`

Get a file from cache. Returns content + hit/miss status.

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Absolute file path"
  }
}
```

##### `cache_set`

Force a file into the cache with given content.

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Absolute file path"
  },
  "content": {
    "type": "string",
    "description": "File content to cache"
  }
}
```

##### `cache_invalidate`

Invalidate one file or the entire cache (omit path to clear all).

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "File path to invalidate; omit to clear all"
  }
}
```

##### `cache_warmup`

Pre-load a list of files into the cache.

**Input:**
```json
{
  "paths": {
    "type": "array",
    "description": "List of absolute file paths to cache"
  }
}
```

##### `cache_stats`

Return cache metrics: entry count, total size, hit rate.

**Input:**
```json
{}
```

---

### callgraph

> Call graph analysis — callers, callees, call chains.

- **Prefix**: `cg`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `cg_callers`

Find which functions call this function (grep usage in files).

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Function name to find callers for"
  },
  "dir": {
    "type": "string",
    "description": "Directory to search in"
  }
}
```

##### `cg_callees`

Find which functions this function calls.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Function name"
  },
  "file": {
    "type": "string",
    "description": "File containing the function"
  },
  "startLine": {
    "type": "number",
    "description": "Start line of function body"
  },
  "endLine": {
    "type": "number",
    "description": "End line of function body"
  }
}
```

##### `cg_chain`

Find the call chain from function A to function Z.

**Input:**
```json
{
  "from": {
    "type": "string",
    "description": "Start function name"
  },
  "to": {
    "type": "string",
    "description": "End function name"
  },
  "dir": {
    "type": "string",
    "description": "Directory to search in"
  },
  "maxDepth": {
    "type": "number",
    "description": "Maximum search depth (default 5)"
  }
}
```

##### `cg_depth`

Find the maximum call depth of a function.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Function name"
  },
  "dir": {
    "type": "string",
    "description": "Directory to search in"
  },
  "maxDepth": {
    "type": "number",
    "description": "Maximum depth to explore (default 5)"
  }
}
```

---

### compress

> Compress text output to save tokens — strip comments, collapse whitespace, abbreviate patterns.

- **Prefix**: `cmp`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `cmp_output`

Strip comments, collapse whitespace, remove blank lines from code or text.

**Input:**
```json
{
  "text": {
    "type": "string",
    "description": "Text to compress"
  },
  "level": {
    "type": "string",
    "description": "Compression level (default: medium)"
  }
}
```

##### `cmp_response`

Compress a JSON tool response: strip null/undefined values, shorten paths, abbreviate keys.

**Input:**
```json
{
  "json": {
    "type": "string",
    "description": "JSON string to compress"
  }
}
```

##### `cmp_terse`

Ultra-compressed: keep ONLY identifiers, function names, type names. Strip all implementation.

**Input:**
```json
{
  "text": {
    "type": "string",
    "description": "Source text to make terse"
  }
}
```

---

### depgraph

> Dependency graph analysis — imports, exports, circular deps, fan-in/out.

- **Prefix**: `dep`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `dep_imports`

List all imports of a file.

**Input:**
```json
{
  "file": {
    "type": "string",
    "description": "Absolute file path"
  }
}
```

##### `dep_exports`

List all exports of a file.

**Input:**
```json
{
  "file": {
    "type": "string",
    "description": "Absolute file path"
  }
}
```

##### `dep_circular`

Detect circular dependencies in a directory.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Absolute directory path"
  }
}
```

##### `dep_fanin`

Find which files import this file.

**Input:**
```json
{
  "file": {
    "type": "string",
    "description": "Absolute file path"
  },
  "dir": {
    "type": "string",
    "description": "Directory to search in"
  }
}
```

##### `dep_fanout`

Count how many files this file imports.

**Input:**
```json
{
  "file": {
    "type": "string",
    "description": "Absolute file path"
  }
}
```

---

### echo

> Hello-world brick — returns the message it receives. Serves as a smoke test for the FocusMCP pipeline.

- **Prefix**: `echo`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `echo_say`

Returns the received message as-is. Useful as a canary to verify FocusMCP correctly dispatches tool calls end-to-end.

**Input:**
```json
{
  "message": {
    "type": "string",
    "description": "Message to echo back"
  }
}
```

---

### filediff

> File comparison — diff, patch, delta between files or versions.

- **Prefix**: `fd`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `fd_diff`

Compare two files and return unified diff

**Input:**
```json
{
  "a": {
    "type": "string",
    "description": "Path to first file"
  },
  "b": {
    "type": "string",
    "description": "Path to second file"
  }
}
```

##### `fd_patch`

Apply a unified diff patch to a file

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "File to patch"
  },
  "patch": {
    "type": "string",
    "description": "Unified diff content"
  }
}
```

##### `fd_delta`

Show only changed lines between two strings (compact)

**Input:**
```json
{
  "before": {
    "type": "string",
    "description": ""
  },
  "after": {
    "type": "string",
    "description": ""
  }
}
```

---

### filelist

> List directory contents — entries, tree, glob, find.

- **Prefix**: `fl`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `fl_list`

List files and directories in a path

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Absolute directory path"
  }
}
```

##### `fl_tree`

Recursive directory tree

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  },
  "depth": {
    "type": "number",
    "description": "Max depth (default unlimited)"
  }
}
```

##### `fl_glob`

Find files matching a glob pattern

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  },
  "pattern": {
    "type": "string",
    "description": "Glob pattern (e.g. *.ts)"
  }
}
```

##### `fl_find`

Find files by name (substring match)

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  },
  "name": {
    "type": "string",
    "description": "Filename substring to match"
  }
}
```

---

### fileops

> File operations — move, copy, delete, rename.

- **Prefix**: `fo`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `fo_move`

Move a file or directory to a new path

**Input:**
```json
{
  "from": {
    "type": "string",
    "description": "Source path"
  },
  "to": {
    "type": "string",
    "description": "Destination path"
  }
}
```

##### `fo_copy`

Copy a file to a new path

**Input:**
```json
{
  "from": {
    "type": "string",
    "description": ""
  },
  "to": {
    "type": "string",
    "description": ""
  }
}
```

##### `fo_delete`

Delete a file or empty directory

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Absolute path to delete"
  }
}
```

##### `fo_rename`

Rename a file within its parent directory

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Current file path"
  },
  "name": {
    "type": "string",
    "description": "New filename (not a full path)"
  }
}
```

---

### fileread

> Read files — full, head, tail, line range, encoding detection.

- **Prefix**: `fr`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `fr_read`

Read entire file content

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Absolute file path"
  }
}
```

##### `fr_head`

Read first N lines of a file

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  },
  "lines": {
    "type": "number",
    "description": "Number of lines (default 10)"
  }
}
```

##### `fr_tail`

Read last N lines of a file

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  },
  "lines": {
    "type": "number",
    "description": "Number of lines (default 10)"
  }
}
```

##### `fr_range`

Read specific line range from a file

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  },
  "from": {
    "type": "number",
    "description": "Start line (1-based)"
  },
  "to": {
    "type": "number",
    "description": "End line (inclusive)"
  }
}
```

---

### filesearch

> Search and replace in files — regex search, in-place replace.

- **Prefix**: `fsrch`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `fsrch_search`

Search for a regex pattern in files

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Directory to search in"
  },
  "pattern": {
    "type": "string",
    "description": "Regex pattern"
  },
  "glob": {
    "type": "string",
    "description": "File glob filter (e.g. *.ts)"
  }
}
```

##### `fsrch_replace`

Search and replace in a file

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "File path"
  },
  "pattern": {
    "type": "string",
    "description": "Regex pattern to find"
  },
  "replacement": {
    "type": "string",
    "description": "Replacement string"
  }
}
```

---

### filesystem

> Complete filesystem operations — loads fileread, filewrite, filelist, fileops, filesearch.

- **Prefix**: `fs`
- **Version**: 0.0.0
- **Dependencies**: `fileread`, `filewrite`, `filelist`, `fileops`, `filesearch`
- **Type**: composite

---

### filewrite

> Write files — create, overwrite, append.

- **Prefix**: `fw`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `fw_write`

Write content to a file (creates or overwrites)

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Absolute file path"
  },
  "content": {
    "type": "string",
    "description": "Content to write"
  }
}
```

##### `fw_append`

Append content to end of a file

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  },
  "content": {
    "type": "string",
    "description": ""
  }
}
```

##### `fw_create`

Create a file only if it does not already exist

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  },
  "content": {
    "type": "string",
    "description": ""
  }
}
```

---

### memory

> Persistent key-value memory — store and recall information across sessions as JSON files.

- **Prefix**: `mem`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `mem_store`

Save a key-value pair to persistent memory.

**Input:**
```json
{
  "key": {
    "type": "string",
    "description": "Memory key"
  },
  "value": {
    "type": "string",
    "description": "Value to store"
  },
  "tags": {
    "type": "array",
    "description": "Optional tags for categorization"
  }
}
```

##### `mem_recall`

Get a value by key from persistent memory.

**Input:**
```json
{
  "key": {
    "type": "string",
    "description": "Memory key"
  }
}
```

##### `mem_search`

Search memories by query (substring match on key, value, and tags).

**Input:**
```json
{
  "query": {
    "type": "string",
    "description": "Search query"
  },
  "limit": {
    "type": "number",
    "description": "Max results (default 10)"
  }
}
```

##### `mem_forget`

Delete a memory entry by key.

**Input:**
```json
{
  "key": {
    "type": "string",
    "description": "Memory key to delete"
  }
}
```

##### `mem_list`

List all memory keys, optionally filtered by tag.

**Input:**
```json
{
  "tag": {
    "type": "string",
    "description": "Filter by tag (optional)"
  }
}
```

---

### multiread

> Batch file reading — multiple files in one call, deduplication.

- **Prefix**: `mr`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `mr_batch`

Read multiple files in one call

**Input:**
```json
{
  "paths": {
    "type": "array",
    "description": "List of file paths to read"
  }
}
```

##### `mr_dedup`

Read multiple files, deduplicate shared imports/headers

**Input:**
```json
{
  "paths": {
    "type": "array",
    "description": ""
  }
}
```

##### `mr_merge`

Read and concatenate files with separators

**Input:**
```json
{
  "paths": {
    "type": "array",
    "description": ""
  },
  "separator": {
    "type": "string",
    "description": "Separator between files (default: filename header)"
  }
}
```

---

### outline

> File and repo structure outline — list exported symbols and directory trees without reading full content.

- **Prefix**: `out`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `out_file`

Outline a single file: list exported symbols with line numbers, no body.

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Absolute path to file"
  }
}
```

##### `out_repo`

Outline entire repo: per-file symbol summary.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  },
  "maxFiles": {
    "type": "number",
    "description": "Max files to scan (default 100)"
  }
}
```

##### `out_structure`

Directory structure with file counts per folder.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  },
  "maxDepth": {
    "type": "number",
    "description": "Max depth (default 3)"
  }
}
```

---

### overview

> Project-level understanding without reading all files — detect framework, language, conventions, and architecture.

- **Prefix**: `ovw`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `ovw_project`

Scan root dir and detect project metadata: name, framework, language, type, scripts, packageManager.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  }
}
```

##### `ovw_architecture`

Scan directory structure, count files per folder, detect architectural patterns.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  },
  "maxDepth": {
    "type": "number",
    "description": "Max directory depth (default 3)"
  }
}
```

##### `ovw_conventions`

Read sample files and detect coding conventions: indent, quotes, semicolons, import style.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  }
}
```

##### `ovw_dependencies`

Parse package.json and categorize dependencies: production, dev, framework, testRunner, linter, bundler.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Root directory containing package.json"
  }
}
```

---

### refs

> Cross-references — find who imports or uses a symbol, locate declarations, and trace inheritance chains.

- **Prefix**: `refs`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `refs_references`

Find all files that import or reference a symbol name.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Symbol name to search for"
  },
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  }
}
```

##### `refs_implementations`

Find implementations of an interface or type.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Interface or type name"
  },
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  }
}
```

##### `refs_declaration`

Find where a symbol is declared or exported.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Symbol name"
  },
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  }
}
```

##### `refs_hierarchy`

Class or interface inheritance chain.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Class or interface name"
  },
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  }
}
```

---

### session

> Session context save and restore — track loaded files and operations, persist sessions to disk.

- **Prefix**: `ses`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `ses_save`

Save current session state to disk.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Session name"
  },
  "data": {
    "type": "object",
    "description": "Session data to save"
  }
}
```

##### `ses_restore`

Restore a saved session from disk.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Session name to restore"
  }
}
```

##### `ses_context`

Get current in-memory session summary.

**Input:**
```json
{}
```

##### `ses_history`

List all saved sessions.

**Input:**
```json
{}
```

---

### smartcontext

> Composite brick — orchestrates smartread, cache, compress, tokenbudget, and overview to deliver optimal context within a token budget.

- **Prefix**: `sctx`
- **Version**: 0.0.0
- **Dependencies**: `smartread`, `cache`, `compress`, `tokenbudget`, `overview`
- **Type**: composite

#### Tools

##### `sctx_load`

Auto-discover relevant files for a task, choose read modes, and return optimal context within budget.

**Input:**
```json
{
  "task": {
    "type": "string",
    "description": "Task description to contextualize"
  },
  "dir": {
    "type": "string",
    "description": "Root directory to scan"
  },
  "budget": {
    "type": "number",
    "description": "Token budget (default: 2000)"
  }
}
```

##### `sctx_refresh`

Re-check files for changes and update context using cache to detect stale entries.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Directory to refresh"
  },
  "budget": {
    "type": "number",
    "description": "Token budget (default: 2000)"
  }
}
```

##### `sctx_status`

Show current context budget usage and cache statistics.

**Input:**
```json
{}
```

---

### smartread

> Intelligent file reading — multiple modes to minimize token usage.

- **Prefix**: `sr`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `sr_full`

Read entire file (fallback mode)

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  }
}
```

##### `sr_map`

Read file structure only — function/class signatures, no bodies

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  }
}
```

##### `sr_signatures`

Extract only exported function/class signatures

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  }
}
```

##### `sr_imports`

Extract only import/require statements

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  }
}
```

##### `sr_summary`

One-line summary per function/block (name + line count)

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": ""
  }
}
```

---

### symbol

> Symbol lookup in source files — find, get, bulk, body.

- **Prefix**: `sym`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `sym_find`

Find symbols by name (substring match) in a directory.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Symbol name or substring"
  },
  "dir": {
    "type": "string",
    "description": "Directory to search in"
  }
}
```

##### `sym_get`

Get exact symbol match with signature.

**Input:**
```json
{
  "name": {
    "type": "string",
    "description": "Exact symbol name"
  },
  "dir": {
    "type": "string",
    "description": "Directory to search in"
  }
}
```

##### `sym_bulk`

Look up multiple symbols in one call.

**Input:**
```json
{
  "names": {
    "type": "array",
    "description": "Symbol names to look up"
  },
  "dir": {
    "type": "string",
    "description": "Directory to search in"
  }
}
```

##### `sym_body`

Read the body of a symbol (lines startLine to endLine).

**Input:**
```json
{
  "file": {
    "type": "string",
    "description": "Absolute file path"
  },
  "startLine": {
    "type": "number",
    "description": "Start line (1-based)"
  },
  "endLine": {
    "type": "number",
    "description": "End line (inclusive)"
  }
}
```

---

### tokenbudget

> Token budget management — estimate and optimize token usage for AI agents.

- **Prefix**: `tb`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `tb_estimate`

Estimate token count for text (chars/4 heuristic, adjusted for code vs prose).

**Input:**
```json
{
  "text": {
    "type": "string",
    "description": "Text to estimate"
  },
  "path": {
    "type": "string",
    "description": "File path to read and estimate"
  }
}
```

##### `tb_analyze`

Analyze token cost of a directory recursively, per-file breakdown sorted by cost.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Directory to analyze"
  },
  "maxFiles": {
    "type": "number",
    "description": "Max files to analyze (default 50)"
  }
}
```

##### `tb_fill`

Given a token budget and file list, select files that fit using compression levels to maximize info.

**Input:**
```json
{
  "budget": {
    "type": "number",
    "description": "Token budget"
  },
  "files": {
    "type": "array",
    "description": "List of file paths"
  },
  "mode": {
    "type": "string",
    "description": "Read mode (default: signatures)"
  }
}
```

##### `tb_optimize`

Suggest how to read a set of files within a budget.

**Input:**
```json
{
  "budget": {
    "type": "number",
    "description": "Token budget"
  },
  "dir": {
    "type": "string",
    "description": "Directory to optimize"
  }
}
```

---

### treesitter

> Regex-based code indexer for TypeScript/JavaScript — parses symbols, imports, exports.

- **Prefix**: `ts`
- **Version**: 0.0.0
- **Dependencies**: none
- **Type**: atomic

#### Tools

##### `ts_index`

Index a directory: parse all TS/JS files and store symbols in memory.

**Input:**
```json
{
  "dir": {
    "type": "string",
    "description": "Absolute path to directory to index"
  }
}
```

##### `ts_reindex`

Re-index a single file.

**Input:**
```json
{
  "path": {
    "type": "string",
    "description": "Absolute path to file"
  }
}
```

##### `ts_status`

Return index status: file count, symbol count, languages.

**Input:**
```json
{}
```

##### `ts_cleanup`

Clear the entire index.

**Input:**
```json
{}
```

##### `ts_langs`

List supported languages.

**Input:**
```json
{}
```

---
