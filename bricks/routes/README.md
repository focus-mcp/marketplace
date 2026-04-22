# @focus-mcp/routes

API route detection — scan projects for Express, Fastify, Next.js, SvelteKit route definitions.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `scan` | `rt_scan` | Scan a project directory and detect all API routes/endpoints with HTTP methods |
| `search` | `rt_search` | Search routes by path pattern or HTTP method |
| `list` | `rt_list` | List all detected routes in a compact table format |
| `frameworks` | `rt_frameworks` | Detect which web frameworks are used in the project |

## Supported frameworks

- **Express** — `app.get()`, `app.post()`, `router.get()`, etc.
- **Fastify** — same patterns as Express
- **Next.js App Router** — `app/**/route.ts` with exported `GET`, `POST`, … functions
- **SvelteKit** — `src/routes/**/*+server.ts` with exported `GET`, `POST`, … functions
