# RepoRadar — Backend & Keys Setup

This is the click-by-click runbook for standing up RepoRadar's backend: database,
auth, and LLM API keys. Follow it top to bottom. You can stop after any stage —
each one adds capability on top of the last.

---

## 0. First, the "training" question

**You do not train any model here, and you shouldn't.** RepoRadar runs
deterministic static-analysis scanners over a repo, then sends the *results* to a
hosted Llama model (Groq/OpenRouter) which writes a plain-English synthesis. That
is an **inference API call**, not training. The free tiers don't offer fine-tuning
anyway, and you don't need it — the model never sees raw code, only masked findings.

So "set up + train the models" reduces to one thing: **paste an API key**. That's Stage 3.

---

## Stage 1 — Run locally with zero keys (2 minutes)

You can run the whole app right now with no accounts.

```bash
npm install
npm run dev
```

Open http://localhost:3000. In this mode:

- Scans run **anonymously** (3/day per IP), the **Try demo** button works.
- Real scanners run; the "LLM Synthesis" section is a deterministic summary (mock).
- Nothing is persisted (no database).

`.env.local` is already created with everything blank for exactly this. Confirm
what's wired at any time by visiting **http://localhost:3000/api/health**.

---

## Stage 2 — Database + Auth (Supabase)

This turns on accounts, scan history, and saved reports. Free tier is plenty
(500 MB DB, 50k monthly active users).

1. **Create a project** at https://supabase.com → New project. Pick a region near you.
2. **Run the schema.** In the Supabase dashboard → **SQL Editor** → paste the entire
   contents of `supabase/schema.sql` → **Run**. This creates the tables
   (`users`, `scans`, `findings`, `reports`, `saved_reports`, `chunk_metadata`),
   the RLS policies, indexes, and the trigger that auto-creates a `users` row on signup.
   The script is idempotent — safe to re-run.
3. **Get your keys.** Dashboard → **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` &nbsp;**(server-only secret — never expose)**
4. **Enable email/password.** Dashboard → **Authentication → Providers → Email** → enable.
   For fastest local testing, turn *off* "Confirm email" (turn it back on for production).
5. Paste the three values into `.env.local`, then restart `npm run dev`.

Once Supabase is set, **real repository scans require sign-in** (the demo stays open).
Sign up at `/signup`, and your scans now appear under **History** and are savable under
**Saved Reports**.

### Optional: GitHub OAuth (recommended for a dev tool)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Homepage URL: `http://localhost:3000` (and your prod URL later)
   - **Authorization callback URL:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Copy the Client ID + secret into Supabase → **Authentication → Providers → GitHub** → enable.
3. In Supabase → **Authentication → URL Configuration**, add your redirect URLs
   (`http://localhost:3000/dashboard` and your production equivalent).

The "Continue with GitHub" buttons already work — the app captures the returned token
from the redirect automatically.

---

## Stage 3 — LLM API keys (real synthesis)

Pick **one** (or several — the app rotates and falls back automatically).

### Option A — Groq (fastest, recommended free tier)
1. https://console.groq.com → sign in → **API Keys → Create API Key**.
2. Put it in `.env.local` as `GROQ_API_KEY=gsk_...`.

### Option B — OpenRouter (free Llama endpoint, good fallback)
1. https://openrouter.ai → **Keys → Create Key**.
2. `OPENROUTER_API_KEY=sk-or-...`

### Option C — Ollama (fully local, no rate limits)
1. Install from https://ollama.com, then `ollama pull llama3.1`.
2. `OLLAMA_BASE_URL=http://localhost:11434`

**Rate-limit resilience (built in):** to survive the free-tier ceiling, register a few
Groq accounts and pass a comma-separated pool:

```bash
GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3
```

The provider layer round-robins across keys and, on a `429` or failure, advances to the
next key → then OpenRouter → then Ollama → then the deterministic mock. A scan never
hard-fails on rate limits; worst case it degrades to the mock summary.

---

## Stage 4 — Optional: Upstash Redis (distributed cache + rate limits)

Without Redis, caching is off and rate limits are per-instance (fine for local/single
server). With it, identical popular-repo scans are cached (1h) and limits hold across
serverless instances.

1. https://upstash.com → create a Redis database → **REST API** section.
2. `REDIS_REST_URL=https://...upstash.io` and `REDIS_REST_TOKEN=...`

---

## Environment variable reference

| Variable | Required? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | yes | Base URL (localhost or prod domain) |
| `NEXT_PUBLIC_SUPABASE_URL` | for persistence | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for persistence | Public anon key (browser auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | for persistence | **Server-only** DB access |
| `GROQ_API_KEY` / `GROQ_API_KEYS` | for real LLM | Groq key or rotation pool |
| `OPENROUTER_API_KEY` / `OPENROUTER_API_KEYS` | optional | Fallback provider |
| `OLLAMA_BASE_URL` | optional | Local Llama |
| `LLM_CONCURRENCY` | optional | Max concurrent synthesis calls (default 4) |
| `ANONYMOUS_SCANS_PER_DAY` | optional | Default 3 |
| `FREE_TIER_SCANS_PER_DAY` | optional | Default 5 |
| `PRO_TIER_SCANS_PER_DAY` | optional | Default 100 |
| `MAX_CONCURRENT_SCANS_PER_USER` | optional | Default 1 |
| `GITHUB_TOKEN` | optional | Raises GitHub API limit 60→5000/hr |
| `REDIS_REST_URL` / `REDIS_REST_TOKEN` | optional | Cache + distributed limits |

---

## Deploying (Vercel)

1. Push to GitHub, import the repo in Vercel.
2. Add every variable above under **Project → Settings → Environment Variables**
   (use the same keys; do **not** mark server secrets as public).
3. Set `NEXT_PUBLIC_APP_URL` to your production domain.
4. Update Supabase **URL Configuration** and the GitHub OAuth callback to the prod domain.

---

## How ownership & privacy actually work (important, honest note)

- **Source code is never stored.** Only masked findings, report JSON/markdown, and
  metadata are persisted — matching the copy shown in the app.
- **Row ownership is enforced in application code**, by `user_id` filters on every query,
  because the server uses the Supabase **service-role key** (which *bypasses* RLS). The
  RLS policies in `schema.sql` are real but act as **defense-in-depth**, not the primary
  gate. A `requireUserId` guard in `src/lib/persistence.ts` makes a forgotten filter fail
  loudly instead of leaking data. If you later want RLS to be the *primary* enforcement,
  switch the persistence layer to per-request anon-key + user-JWT clients.
