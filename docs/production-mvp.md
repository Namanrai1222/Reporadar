# RepoRadar Production MVP Backend

RepoRadar is a repository X-ray: deterministic source analysis first, LLM synthesis second. This implementation preserves the existing frontend and adds production backend seams for Supabase persistence, auth ownership, queueing, cache, retrieval, provider abstraction, and observability.

## Environment

Required for persisted production scans:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional:

```bash
GITHUB_TOKEN=...
REDIS_REST_URL=...
REDIS_REST_TOKEN=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
```

Never use `NEXT_PUBLIC_` for provider secrets. The server blocks dangerous names like `NEXT_PUBLIC_GROQ_API_KEY`.

## Supabase Setup

1. Create a Supabase project.
2. Enable GitHub OAuth and email/password in Supabase Auth.
3. Run `supabase/schema.sql` in the SQL editor.
4. Add the environment variables above.

The schema enables RLS on every persisted table. Reports and findings are scoped by `user_id`.

## Persistence Contract

RepoRadar persists:

- scan metadata
- masked findings
- report JSON
- report Markdown
- chunk metadata such as path, symbol, hash, and importance

RepoRadar never persists:

- raw repository source code
- raw chunk text
- unmasked secrets
- GitHub tokens
- LLM provider keys

## Queue And Cache

`src/lib/queue.ts` supports Redis REST as a distributed queue seam. Local development returns `inline-development` and immediately runs the scan so the frontend remains usable.

`src/lib/cache.ts` supports Redis REST for normalized report caching. Cache keys include repo, branch, mode, model, scanner version, retrieval version, and prompt version.

## LLM Providers

`src/lib/llm.ts` builds an ordered fallback chain per request and tries each entry
until one succeeds:

1. Groq — every configured key is its own attempt (round-robin, rotated per request)
2. OpenRouter — same key-pool behavior
3. Ollama (if `OLLAMA_BASE_URL` set)
4. Mock deterministic synthesis (never throws — a scan always returns)

A `429` or any failure advances to the next key/provider. A process-level semaphore
(`LLM_CONCURRENCY`, default 4) throttles concurrent synthesis calls. Provide pools via
`GROQ_API_KEYS` / `OPENROUTER_API_KEYS` (comma-separated).

LLM output is appended as synthesis only. Scanner findings, severity, confidence, and evidence remain deterministic.

## Rate Limiting

`src/lib/rate-limit.ts` enforces per-day scan budgets and per-user concurrency, backed by
Redis REST when configured (limits hold across instances) or an in-memory store locally.

- Anonymous: `ANONYMOUS_SCANS_PER_DAY` (default 3), keyed by hashed IP.
- Authenticated: by `users.plan_tier` — `FREE_TIER_SCANS_PER_DAY` (5) / `PRO_TIER_SCANS_PER_DAY` (100).
- Concurrency: `MAX_CONCURRENT_SCANS_PER_USER` (default 1).

Over-limit requests return `429` with code `RATE_LIMITED`.

## Row Ownership (honest note)

Persistence uses the **service-role key**, which bypasses RLS. Ownership is therefore
enforced in application code via `user_id=eq.` filters plus a `requireUserId` guard.
The RLS policies in `schema.sql` remain as defense-in-depth.

## API Surface

- `POST /api/scans`: create and run a scan (rate-limited)
- `GET /api/scans`: list authenticated scan history (includes related `report_id`)
- `GET /api/reports/:id`: read an owned persisted report (returns `{ report, saved }`)
- `POST /api/reports/:id/export`: download owned report Markdown
- `POST` / `DELETE /api/reports/:id/save`: bookmark / un-bookmark a report
- `GET /api/saved-reports`: list the caller's bookmarked reports
- `GET /api/health`: check configured backend providers

Machine-readable errors include `AUTH_REQUIRED`, `RATE_LIMITED`, `SERVER_NOT_CONFIGURED`, `INVALID_REPOSITORY_URL`, `NOT_FOUND`, `DATABASE_ERROR`, and `INTERNAL_ERROR`.

