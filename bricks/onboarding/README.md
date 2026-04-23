# @focusmcp/onboarding

Project onboarding workflow — auto-discover project structure, conventions, and key files for a new contributor or AI agent.

## Dependencies

- `codebase` — complete codebase intelligence
- `smartcontext` — context assembly within token budget
- `overview` — project-level metadata (framework, language, conventions, architecture)

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `scan` | `onb_scan` | Full project onboarding scan — detect framework, architecture, conventions, key files, and build a context summary |
| `guide` | `onb_guide` | Generate a contributor guide based on scan results — what to read first, coding standards, key patterns |

## How it works

`onb_scan` orchestrates three `overview:*` bus calls (`project`, `architecture`, `conventions`) and combines them with a local key-file scan to produce a structured `ScanOutput`. Results are cached in session state.

`onb_guide` uses the cached scan (or triggers a new one) to render a Markdown contributor guide with six sections: _What to read first_, _Project overview_, _Architecture_, _Coding standards_, _Key files_, and _Getting started_.

When no bus is available (standalone / test mode), both tools fall back to lightweight local implementations that read `package.json`, `biome.json`, `tsconfig.json`, and the filesystem directly.
