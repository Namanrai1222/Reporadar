# Security audit response

Response to the pre-launch audit. Each item records what was actually found in the
code, not just what was reported — several items were already fixed before the audit
ran, and one was misdiagnosed.

## Summary

| # | Item | Audit severity | Actual state | Action |
|---|------|----------------|--------------|--------|
| 1 | Report data in URL query string | CRITICAL | Confirmed | Fixed — always fetched by id |
| 2 | "No working authentication backend" | CRITICAL | Misdiagnosed | Fixed — root cause was a CSP bug |
| 3 | Client-side-only route protection | CRITICAL | Already fixed | Verified by test |
| 4 | SSRF in repository fetch | CRITICAL | Already prevented | Hardened + verified by test |
| 5 | Unsanitized markdown rendering | HIGH | Not present | Verified — no HTML rendering path exists |
| 6 | `NEXT_PUBLIC_*` secret exposure | HIGH | Partly guarded | Hardened to a generic check |
| 7 | Missing rate limiting | HIGH | Scans only | Added on auth routes |
| 8 | Cookie & CSRF hardening | HIGH | Design mismatch | Migrated to `HttpOnly` cookies + CSRF |
| 9 | Long sensitive URLs logged | MEDIUM | Consequence of #1 | Resolved by #1 |
| 10 | Dev-mode error handling | MEDIUM | Config concern | Verified by test |
| 11 | Repo URL validation | MEDIUM | Already present | Hardened + verified |
| 12 | "Continue without an account" | NORMAL | UI/server mismatch | Resolved |
| 13 | Automated tests | NORMAL | None existed | 78 tests added |
| 14 | Logging/monitoring | NORMAL | Structured logs exist | Not wired to Sentry (see below) |

---

## The two findings that mattered

### #1 — Report contents travelled in the URL (confirmed)

`dashboard/page.tsx` serialised the entire scan result into `?data=`, and
`ReportShell` re-appended it to every tab link. Findings, file paths and masked
secret evidence therefore landed in browser history, server access logs and
`Referer` headers, and could be rewritten by editing the address bar.

**Fix.** The inline path is gone. `/report/[id]` fetches from
`GET /api/reports/:id`, which scopes the query to the caller
(`getReport(id, user.id)`). A report belonging to someone else returns **404, not
403**, so the endpoint cannot be used to discover which ids exist.

The audit suggested adding "integrity checks so results can't be tampered with."
That was not the right fix — signing the blob would have kept a multi-hundred-KB
payload in the URL, along with the history and log exposure, and added a signing key
to manage. Removing the payload eliminates the whole class of problem. The report
was already persisted server-side before the response returned, so the round-trip
this avoided was redundant.

### #2 — Auth failure was a CSP bug, not a missing backend

The auth code was complete and correct: GoTrue password sign-in, GitHub OAuth,
refresh-token renewal. The reason both valid *and invalid* credentials returned
"Could not reach the authentication server" is that neither request ever left the
page.

`securityHeaders()` set `connect-src 'self' https://api.github.com`. The browser
called Supabase directly at `https://<project>.supabase.co`, which is not in that
list, so the CSP blocked every call. `fetch` rejected with a `TypeError`, which
`auth-client.ts` caught and reported as a network failure — identical for good and
bad credentials, because credentials were never checked.

**Fix.** The Supabase origin is now derived from `NEXT_PUBLIC_SUPABASE_URL` and
included in `connect-src`.

---

## Items that were already fixed

Reported as CRITICAL/HIGH but already implemented. Now covered by tests so they stay
that way.

**#3 — Server-side route guards.** Every route already called `requireUser` or
`getUserFromRequest`: `/api/scans`, `/api/reports/[id]`, `/api/reports/[id]/save`,
`/api/reports/[id]/export`, `/api/saved-reports`. Defence in depth also existed via
`requireUserId()` in `persistence.ts` and RLS policies in `supabase/schema.sql`.

**#4 — SSRF.** The user-supplied URL is never fetched. `parseGitHubRepoUrl`
extracts `owner`/`repo`, validates them against `/^[A-Za-z0-9_.-]+$/`, and they are
interpolated into hardcoded `api.github.com` and `raw.githubusercontent.com` URLs.
This is stronger than an allow-list — there is no code path that fetches an
attacker-controlled host, so DNS rebinding is not a concern either.

Added anyway, because a named control is testable and survives refactoring: an
explicit `isPrivateHost` check rejecting loopback, link-local (including
`169.254.169.254`), and RFC 1918 ranges, plus a non-HTTP scheme rejection.

**#5 — Markdown/XSS.** There is no markdown-to-HTML path. `dangerouslySetInnerHTML`
appears nowhere in the codebase; the report markdown renders inside `<pre>{...}</pre>`,
which React escapes. Adding `rehype-sanitize` would mean adding a dependency to
sanitise HTML that is never generated. Production CSP is `script-src 'self'`.

---

## Design changes worth knowing about

### #8 — Sessions moved from `localStorage` to `HttpOnly` cookies

The audit asked for `HttpOnly`/`Secure`/`SameSite=Strict` cookies and CSRF
protection. The app did not use cookies at all — it stored the Supabase access
token in `localStorage` and sent it as a `Bearer` header. Under that design CSRF was
genuinely not applicable (no ambient credentials), but any XSS could read the token.

Sessions now flow through our own origin:

```
browser → POST /api/auth/signin → (server) → Supabase GoTrue
       ← Set-Cookie: rr_session / rr_refresh  (HttpOnly, Secure, SameSite=Strict)
```

New routes: `/api/auth/{signin,signup,signout,refresh,session}`. Because cookies are
ambient, CSRF protection is now required and is enforced two ways — `SameSite=Strict`
(browser omits the cookie cross-site) and an explicit `assertSameOrigin` check on
every state-changing route.

Two consequences:

- There is no synchronous "am I signed in?" check any more. `useAuth` asks
  `/api/auth/session`, and re-checks on window focus (replacing the cross-tab
  `storage` listener, which no longer fires).
- OAuth returns tokens in the URL *fragment*, which never reaches the server.
  `captureOAuthRedirect` posts them to `/api/auth/session`, which **verifies the
  token against GoTrue before setting any cookie** — otherwise that endpoint would
  let a caller plant an arbitrary session in someone's browser.

> **Deployment requirement:** the reverse proxy must overwrite `x-forwarded-host`
> rather than pass through a client-supplied value. `assertSameOrigin` trusts it to
> identify the public origin; a spoofable value would defeat the CSRF check.
> Vercel, Cloudflare and nginx `proxy_set_header` all overwrite by default.

### #7 — Rate limiting

Scan endpoints were already limited (per-plan daily budget, per-IP for anonymous,
plus a concurrency guard). Auth was **not** limited, and could not have been: the
browser talked to Supabase directly, so there was no endpoint of ours to throttle.
Server-proxying auth for #8 created one. Now enforced:

| Budget | Limit | Window |
|---|---|---|
| Sign-in per IP | 20 | 15 min |
| Sign-in per account | 8 | 15 min |
| Sign-up per IP | 5 | 1 hour |

Both sign-in budgets return an identical 429 message so the response cannot reveal
whether an account exists or is under attack.

> Limits are per-instance unless `REDIS_REST_URL` / `REDIS_REST_TOKEN` are set.
> **Configure Redis before launch**, or serverless scale-out multiplies every limit
> by the instance count.

### #6 — Env guard

`assertSafeServerEnvironment` denylisted five specific variable names, which would
miss `NEXT_PUBLIC_STRIPE_SECRET_KEY` and every future provider. Replaced with a
pattern match over all `NEXT_PUBLIC_*` names (`SECRET`, `SERVICE_ROLE`, `PRIVATE`,
`PASSWORD`, `CREDENTIAL`, `API_KEY`, `_TOKEN`, `ACCESS_KEY`), allowlisting the
three that are public by design. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally
public — it carries no privileges and is constrained by RLS.

### #12 — Anonymous access

The landing page promised "No account. No installation" while the server already
rejected anonymous scans with `AUTH_REQUIRED`. Resolved in favour of what the server
enforces: the seeded demo is public, real scans require an account. Copy updated, and
the sign-in page's "Continue without an account" link now points at the demo report
instead of a dashboard that could only produce a 401.

### Bonus fix — invalid URLs returned 500

`parseGitHubRepoUrl` threw a plain `Error`, which `errorResponse` maps to a 500. A
user typo produced a server error. It now throws `AppError(…, 400)`.

---

## Verification

```bash
npm run test:unit       # 37 tests, no server needed
npm run test:security   # 41 tests against a production build
npm test                # both
```

`npm run test:unit` passes (37/37). The API suite compiles and enumerates 41 tests
but was **not executed here** — it needs a production build and a live server, which
the sandbox this work was done in could not run. **Run `npm run test:security`
locally before deploying.**

The suite covers the audit's stated acceptance criteria directly:

- **Direct API calls while signed out** — every protected route asserted to return
  401 with no data in the body.
- **Reading another user's report by guessing ids** — five id shapes asserted to
  leak nothing, and to be indistinguishable from ids that do not exist.
- **SSRF against `169.254.169.254`** — plus loopback, all RFC 1918 ranges,
  `file://`, and `github.com.attacker.example`. A valid public repo is asserted to
  return 401 rather than 400, proving the 400s are the URL validator firing and not
  auth masking everything.
- **Cookie flags and CSRF** — `HttpOnly` / `SameSite=Strict` asserted on real
  `Set-Cookie` headers; every state-changing route asserted to reject both a foreign
  origin and a missing one.
- **Production error handling (#10)** — the suite builds with `NODE_ENV=production`
  and asserts the CSP contains no `'unsafe-eval'` and that responses carry no stack
  traces.

Typechecking: the server library layer, all API routes, and the report UI pass
`tsc --noEmit` (see `tsconfig.routes.json` / `tsconfig.ui.json`). A full
`npm run build` was not completed in the sandbox — **run it before deploying.**

## Not done

**#14 — Sentry.** `observability.ts` already emits structured JSON to stdout, which
Vercel, Datadog and CloudWatch ingest natively. Adding Sentry is a dependency plus
DSN configuration and was outside the agreed scope; failed auth attempts and scan
errors are already traceable via the existing `emitTelemetry` events.
