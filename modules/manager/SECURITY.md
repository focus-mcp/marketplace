<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Security Policy

## Supported versions

The cli-manager is pre-MVP (`0.x`) and currently at the scaffold stage (no runtime features implemented yet). No version is considered stable.

## Reporting a vulnerability

**Do not open a public issue** for a security vulnerability.

Send a private report via:

- **[GitHub Security Advisories](https://github.com/focus-mcp/cli-manager/security/advisories/new)** (recommended)
- or by email: security@focusmcp.dev

Please include if possible:

- Affected area (API client, Svelte route, build tooling)
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

## Threat model

The cli-manager is a **fully static, client-side bundle**. It runs in the user's browser and speaks HTTP (and SSE) to a local `@focusmcp/cli` instance that the user has explicitly started with `--admin-api`.

As a consequence:

- **No server-side code**, no database, no user data stored outside the browser session.
- **No secret management** — the admin token is pasted into a form and kept in memory; the bundle itself ships no credentials.
- **CORS** is the CLI's responsibility; the default is same-origin localhost. The manager does not relax it.
- **Supply chain** is the main attack surface: third-party npm dependencies, build tooling, GitHub Actions workflows.

## Attack surfaces we prioritize

1. **Admin token handling** — never log, never persist, never forward to third parties.
2. **Rendering user-supplied data** from the CLI (brick names, log messages) — must be escaped by Svelte's default HTML escaping; no `{@html ...}` on untrusted strings.
3. **Build pipeline integrity** — pinned actions, least-privilege `GITHUB_TOKEN`, Renovate + `pnpm audit`.
4. **Hosted version** (`manager.focusmcp.dev`, Phase 2) — strict CSP, no analytics, subresource integrity on CDN assets.

## Project security practices

- Secret scanning (gitleaks) in pre-commit and CI
- Dependency scanning (Renovate + `pnpm audit`)
- SAST (CodeQL) in CI on `src/**/*.ts`
- REUSE compliance (explicit licenses)
- Signed commits (GPG/SSH) recommended for maintainers
