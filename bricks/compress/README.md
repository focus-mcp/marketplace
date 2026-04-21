# @focusmcp/compress

Compress text output to save tokens — strip comments, collapse whitespace, remove blank lines, and abbreviate common patterns.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `output` | `cmp_output` | Strip comments, collapse whitespace, remove blank lines (light/medium/aggressive) |
| `response` | `cmp_response` | Compress JSON responses: strip nulls, shorten paths |
| `terse` | `cmp_terse` | Ultra-compressed: keep only identifier names |
