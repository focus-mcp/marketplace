# @focusmcp/review

Structured code review — analyze code quality, security, architecture patterns, compare versions.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `code` | `rev_code` | Review a file for code quality (complexity, any usage, TODOs, console statements) |
| `security` | `rev_security` | Review a file for security issues (hardcoded secrets, SQL injection, XSS vectors) |
| `architecture` | `rev_architecture` | Review directory structure for architecture patterns (MVC, React, Hexagonal, etc.) |
| `compare` | `rev_compare` | Compare two file versions and list additions, removals, and modifications |
