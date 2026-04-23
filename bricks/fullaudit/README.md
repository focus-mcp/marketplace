# @focusmcp/fullaudit

Full project audit workflow — code quality review, security scan, architecture analysis, and metrics report.

## Dependencies

- `codebase` — project structure and file graph
- `review` — code review patterns
- `metrics` — code metrics collection

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `run` | `audit_run` | Scan a project directory for code quality, security, and architecture issues |
| `report` | `audit_report` | Generate a formatted report from the last audit run |

## Usage

### `audit:run`

```json
{
    "dir": "/path/to/project",
    "checks": ["code", "security", "architecture"]
}
```

Runs lightweight static analysis on all `.ts` / `.js` files found under `dir`.

**Checks performed:**

| Category | Check | What it detects |
|----------|-------|-----------------|
| `code` | `console-log` | Leftover debug statements |
| `code` | `any-usage` | TypeScript `any` type annotations |
| `code` | `todo` | `TODO` / `FIXME` comments |
| `code` | `long-function` | Functions exceeding 60 lines |
| `security` | `eval-usage` | Dynamic code execution calls |
| `security` | `hardcoded-secret` | Passwords, tokens, API keys in source |

**Response:**

```json
{
    "files": ["src/app.ts", "src/config.ts"],
    "codeFindings": [
        { "file": "src/app.ts", "kind": "console-log", "line": 12, "detail": "console.log('debug')" }
    ],
    "securityFindings": [],
    "score": 98,
    "checks": ["code", "security", "architecture"]
}
```

**Score:** starts at 100, deducted by 10 per security finding and 2 per code finding (code penalty capped at 40).

### `audit:report`

```json
{ "format": "markdown" }
```

Formats the last `audit:run` result. Supported formats: `markdown` (default), `json`, `summary`.

**`summary` example:**

```
Audit: /path/to/project
Score: 84/100
Files: 12
Code findings: 3
Security findings: 2
Scanned at: 2026-04-21T10:00:00.000Z
```
