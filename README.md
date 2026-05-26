# Friction Log Viewer

Companion app for the [agent-friction-skill](https://github.com/aurorascharff/agent-friction-skill). Renders friction logs, accepts passive agent submissions, and stores reports for triage.

Live at **[agent-friction-skill.vercel.app](https://agent-friction-skill.vercel.app/)**.

## Routes

- **`/`** — paste a friction log markdown, click View
- **`/view#log=…`** — renders a log from a URL fragment. Nothing leaves the browser — share the link with anyone
- **`/submit?draft=<id>`** — human reviews an agent-submitted report, clicks Submit or Discard
- **`/submit/success`** — confirmation after submission

## API

- **`POST /api/draft`** — agents POST a structured payload ([schema](lib/payload.ts)), get back a `review_url`. Rate-limited, schema-validated, drafts expire in 10 min.
- **`GET /api/reports`** — lists all stored reports with summary, severity counts, framework. Bearer-token gated.
- **`GET /api/reports/[month]/[id]`** — raw markdown of a single report. Bearer-token gated.
- **`GET /api/triage`** — flat list of every friction point across every report. Bearer-token gated.

## Env vars

| Var | Purpose |
|-----|---------|
| `BLOB_READ_WRITE_TOKEN` | Auto-provisioned by Vercel Blob |
| `INGEST_SECRET` | HMAC-signs draft IDs. `openssl rand -hex 32` |
| `REPORTS_API_TOKEN` | Shared secret for the reports/triage API. Same value on the DX Agent |

## Local dev

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```

For ingest + submission locally: `vercel env pull .env.local`.
