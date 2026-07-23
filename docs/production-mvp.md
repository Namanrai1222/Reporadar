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

Provider priority:

1. Groq
2. OpenRouter
3. Ollama
4. Mock deterministic synthesis

LLM output is appended as synthesis only. Scanner findings, severity, confidence, and evidence remain deterministic.

## API Surface

- `POST /api/scans`: create and run a scan
- `GET /api/scans`: list authenticated scan history
- `GET /api/reports/:id`: read an owned persisted report
- `POST /api/reports/:id/export`: download owned report Markdown
- `GET /api/health`: check configured backend providers

Machine-readable errors include `AUTH_REQUIRED`, `SERVER_NOT_CONFIGURED`, `INVALID_REPOSITORY_URL`, `DATABASE_ERROR`, and `INTERNAL_ERROR`.

