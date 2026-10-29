# RepoRadar

RepoRadar is an AI-assisted GitHub repository intelligence and security analysis
app. It fetches public GitHub repositories, runs deterministic static-analysis
checks first, then uses an LLM provider only to summarize those findings.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Local mode works without keys: demo scans run, anonymous scans are limited, and
LLM synthesis falls back to deterministic mock output.

## Production Setup

For accounts, scan history, saved reports, and queued production scans, configure:

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_REST_URL=
REDIS_REST_TOKEN=
SCAN_WORKER_SECRET=
```

Optional providers:

```bash
GITHUB_TOKEN=
GROQ_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=
```

Run `supabase/schema.sql` in Supabase, then schedule a worker to call:

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/scans/worker" \
  -H "Authorization: Bearer $SCAN_WORKER_SECRET"
```

## Validation

```bash
npm run lint
npm run typecheck
npm run test:unit
```
