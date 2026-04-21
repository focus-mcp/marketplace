<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Security Policy

## Supported versions

The marketplace and its bricks are pre-MVP (`0.x`). No brick is yet considered stable. Each brick follows **its own version** (semver, Changesets independent mode).

## Reporting a vulnerability

**Do not open a public issue** for a security vulnerability (in a brick, in the catalog generator, or in the schema).

Send a private report via:

- **[GitHub Security Advisories](https://github.com/focus-mcp/marketplace/security/advisories/new)** (recommended)
- or by email: security@focusmcp.dev

Please include if possible:

- Affected brick (or tooling)
- Description of the issue
- Reproduction steps
- Estimated impact
- Mitigation suggestions

## Our commitment

We commit to:

- **Acknowledge** receipt within 72h
- **Assess** and **prioritize** within 7 days
- **Coordinate** responsible disclosure
- **Credit** the reporter (unless they request otherwise)

## Scope

Since this repository is a **catalog** (not a runtime), the main attack surfaces are:

1. **The `catalog.json`** published on GitHub Pages — JSON integrity, consistency of `integrity`/`sha` values associated with tarballs.
2. **The JSON Schema `schemas/catalog/v1.json`** — a schema regression could let malicious entries through.
3. **The bricks themselves** — a malicious or compromised brick can affect FocusMCP users.
4. **The CI pipeline** — secret scanning, least-privilege workflow permissions.

Vulnerabilities affecting one of these surfaces are our top priority.

## Project security practices

- Secret scanning (gitleaks) in pre-commit and CI
- Dependency scanning (Renovate + `pnpm audit`)
- SAST (CodeQL) in CI
- REUSE compliance (explicit licenses)
- Strict catalog validation against the JSON Schema on every build
- Signed commits (GPG/SSH) recommended for maintainers
