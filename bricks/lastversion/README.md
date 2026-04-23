# @focus-mcp/brick-lastversion

Package version intelligence — latest version, diff, changelog, audit across npm/pypi/github/gitlab.

Inspired by [dvershinin/lastversion](https://github.com/dvershinin/lastversion).

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `latest` | `lv_latest` | Get the latest version of a package with metadata |
| `versions` | `lv_versions` | List all versions, optionally filtered by semver range |
| `diff` | `lv_diff` | Compare two versions: bump type, days between, breaking hints |
| `changelog` | `lv_changelog` | Fetch release notes between two versions (GitHub Releases) |
| `check` | `lv_check` | Check if an installed version is outdated |
| `audit` | `lv_audit` | Fetch security advisories via OSV.dev |

## Sources supported

| Source | `latest` | `versions` | `diff` | `check` | `audit` |
|--------|----------|-----------|-------|---------|--------|
| `npm` | Yes | Yes | Yes | Yes | Yes |
| `pypi` | Yes | Yes | Yes | Yes | Yes |
| `github` | Yes | Yes | Yes | Yes | - |
| `gitlab` | Yes | Yes | Yes | Yes | - |
| `cargo` | - | - | - | - | Yes |
| `gomod` | - | - | - | - | Yes |
| `rubygems` | - | - | - | - | Yes |

## Examples

### Get latest version of a package

```json
{
  "tool": "lv_latest",
  "source": "npm",
  "target": "express"
}
```

Response:
```json
{
  "version": "4.18.2",
  "publishedAt": "2023-02-05T00:00:00.000Z",
  "url": "https://www.npmjs.com/package/express/v/4.18.2"
}
```

### List versions in a semver range

```json
{
  "tool": "lv_versions",
  "source": "npm",
  "target": "react",
  "range": ">=18.0.0",
  "limit": 10
}
```

### Diff two versions

```json
{
  "tool": "lv_diff",
  "source": "npm",
  "target": "lodash",
  "from": "4.0.0",
  "to": "4.17.21"
}
```

Response:
```json
{
  "from": "4.0.0",
  "to": "4.17.21",
  "bumpType": "minor",
  "daysBetween": 2200,
  "breakingChange": false
}
```

### Fetch changelog between releases

```json
{
  "tool": "lv_changelog",
  "repo": "expressjs/express",
  "from": "4.17.0",
  "to": "4.18.2",
  "limit": 10
}
```

### Check if installed version is outdated

```json
{
  "tool": "lv_check",
  "source": "npm",
  "target": "typescript",
  "current": "4.9.0"
}
```

Response:
```json
{
  "current": "4.9.0",
  "latest": "5.3.3",
  "stale": true,
  "bumpType": "major",
  "daysBehind": 450,
  "hasAdvisories": false,
  "advisoryCount": 0
}
```

### Audit a package for vulnerabilities

```json
{
  "tool": "lv_audit",
  "source": "npm",
  "target": "lodash",
  "version": "4.17.20"
}
```

Response:
```json
{
  "advisories": [
    {
      "id": "GHSA-35jh-r3h4-6jhm",
      "severity": "HIGH",
      "summary": "Prototype Pollution in lodash",
      "fixedIn": "4.17.21",
      "url": "https://github.com/advisories/GHSA-35jh-r3h4-6jhm"
    }
  ],
  "count": 1
}
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | Optional. Increases GitHub API rate limit from 60 to 5000 req/hour. |

## Caching

All HTTP responses are cached in-memory for 5 minutes to avoid hammering APIs on repeated calls.
