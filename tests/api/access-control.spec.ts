import { test, expect, type APIRequestContext } from "@playwright/test";

const BASE_URL = `http://127.0.0.1:${process.env.TEST_PORT ?? 3100}`;

/**
 * End-to-end checks against a production build, covering the audit's acceptance
 * criteria: call the API directly while signed out, try to read someone else's
 * report by editing the id, and point the scanner at internal infrastructure.
 *
 * These run with no session cookie — which is the point. The UI hides these
 * surfaces when signed out; the question is whether the *routes* do.
 */

const SAME_ORIGIN = { origin: BASE_URL };

/** POST helper that passes the CSRF origin check, so failures are about authz. */
function post(request: APIRequestContext, url: string, data?: unknown) {
  return request.post(url, { headers: SAME_ORIGIN, data: data ?? {} });
}

test.describe("unauthenticated access to protected routes", () => {
  const protectedGets = ["/api/scans", "/api/saved-reports", "/api/reports/any-report-id"];

  for (const path of protectedGets) {
    test(`GET ${path} is rejected without a session`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path} should not serve data to an anonymous caller`).toBe(401);

      const body = await res.json();
      expect(body.code).toBe("AUTH_REQUIRED");
      // An empty collection is fine; actual rows are not.
      expect(body.scans ?? []).toHaveLength(0);
      expect(body.savedReports ?? []).toHaveLength(0);
      expect(body.report).toBeUndefined();
    });
  }

  test("bookmarking someone else's report is rejected", async ({ request }) => {
    const res = await post(request, "/api/reports/some-other-users-report/save");
    expect(res.status()).toBe(401);
  });

  test("exporting someone else's report is rejected", async ({ request }) => {
    const res = await post(request, "/api/reports/some-other-users-report/export");
    expect(res.status()).toBe(401);
  });
});

test.describe("report id enumeration", () => {
  // Guessing ids must not distinguish "exists but is not yours" from "does not
  // exist" — otherwise the endpoint becomes an oracle for which reports are real.
  const guesses = [
    "00000000-0000-0000-0000-000000000000",
    "11111111-2222-3333-4444-555555555555",
    "vercel-next-js-1700000000000",
    "../../etc/passwd",
    "admin",
  ];

  for (const id of guesses) {
    test(`GET /api/reports/${id} leaks nothing`, async ({ request }) => {
      const res = await request.get(`/api/reports/${encodeURIComponent(id)}`);
      expect([401, 404]).toContain(res.status());
      const body = await res.json().catch(() => ({}));
      expect(body.report).toBeUndefined();
    });
  }

  test("the public demo report is the only unauthenticated report", async ({ request }) => {
    const res = await request.get("/api/reports/demo");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.report?.id).toBe("demo");
    expect(body.report?.findings?.length ?? 0).toBeGreaterThan(0);
    expect(body.saved).toBe(false);
  });
});

test.describe("SSRF via the scan endpoint", () => {
  const ssrfTargets = [
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    "http://127.0.0.1:3100/api/health",
    "http://localhost/owner/repo",
    "http://10.0.0.1/owner/repo",
    "http://192.168.1.1/owner/repo",
    "http://172.16.0.1/owner/repo",
    "file:///etc/passwd",
  ];

  for (const githubUrl of ssrfTargets) {
    test(`refuses to scan ${githubUrl}`, async ({ request }) => {
      const res = await post(request, "/api/scans", { githubUrl, mode: "security-lens" });

      // 400 = the URL validator refused it outright, which is what we want.
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("INVALID_REPOSITORY_URL");
    });
  }

  test("refuses hosts that merely look like GitHub", async ({ request }) => {
    const res = await post(request, "/api/scans", {
      githubUrl: "https://github.com.attacker.example/owner/repo",
      mode: "full-map",
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("INVALID_REPOSITORY_URL");
  });

  test("a well-formed public repo still requires a session", async ({ request }) => {
    // Proves the 400s above are the URL check firing, not auth masking everything.
    const res = await post(request, "/api/scans", {
      githubUrl: "https://github.com/vercel/next.js",
      mode: "full-map",
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).code).toBe("AUTH_REQUIRED");
  });
});

test.describe("CSRF protection on state-changing routes", () => {
  const stateChanging = [
    "/api/scans",
    "/api/reports/some-id/save",
    "/api/reports/some-id/export",
    "/api/auth/signin",
    "/api/auth/signout",
    "/api/auth/refresh",
  ];

  for (const path of stateChanging) {
    test(`POST ${path} rejects a foreign origin`, async ({ request }) => {
      const res = await request.post(path, {
        headers: { origin: "https://evil.example" },
        data: {},
      });
      expect(res.status()).toBe(403);
      expect((await res.json()).code).toBe("CSRF_BLOCKED");
    });

    test(`POST ${path} rejects a missing origin`, async ({ request }) => {
      const res = await request.post(path, { data: {} });
      expect(res.status()).toBe(403);
      expect((await res.json()).code).toBe("CSRF_BLOCKED");
    });
  }

  test("DELETE is guarded too", async ({ request }) => {
    const res = await request.delete("/api/reports/some-id/save", {
      headers: { origin: "https://evil.example" },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("session cookies", () => {
  test("are HttpOnly, SameSite=Strict and host-scoped", async ({ request }) => {
    // Sign-out always emits Set-Cookie with the same attributes used on sign-in,
    // so cookie flags can be asserted without real credentials.
    const res = await post(request, "/api/auth/signout");
    expect(res.status()).toBe(200);

    const setCookie = res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie");
    expect(setCookie.length).toBeGreaterThan(0);

    for (const header of setCookie) {
      expect(header.value).toMatch(/HttpOnly/i);
      expect(header.value).toMatch(/SameSite=strict/i);
      expect(header.value).toMatch(/Path=\//i);
    }

    // Session material must never be readable by script.
    const names = setCookie.map((h) => h.value.split("=")[0]);
    expect(names).toContain("rr_session");
    expect(names).toContain("rr_refresh");
  });

  test("an unauthenticated session probe reports signed-out", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ authenticated: false });
  });

  test("a forged session cookie is not accepted", async ({ request }) => {
    // A JWT the server never issued must fail verification rather than be decoded
    // and trusted.
    const forged = [
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJleHAiOjk5OTk5OTk5OTl9",
      "not-a-real-signature",
    ].join(".");

    const res = await request.get("/api/scans", { headers: { cookie: `rr_session=${forged}` } });

    // 401 when the auth service rejects the token; 502 if it is unreachable. Either
    // way the security claim is the same: a forged cookie yields no data. Asserting
    // both keeps the test meaningful without a live Supabase project.
    expect([401, 502]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(body.scans ?? []).toHaveLength(0);
  });
});

test.describe("auth brute-force protection", () => {
  test("sign-in is rate limited per account", async ({ request }) => {
    // Unique address so the per-account budget is not shared with other runs.
    const email = `bruteforce-${Date.now()}@example.invalid`;
    const attempt = () => post(request, "/api/auth/signin", { email, password: "wrong-password" });

    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      statuses.push((await attempt()).status());
      if (statuses.at(-1) === 429) break;
    }

    expect(statuses, `expected a 429 within 12 attempts, saw ${statuses.join(",")}`).toContain(429);
    // And it must not have taken an unbounded number of guesses to get there.
    expect(statuses.indexOf(429)).toBeLessThanOrEqual(10);
  });

  test("rejects sign-in without credentials", async ({ request }) => {
    const res = await post(request, "/api/auth/signin", {});
    expect(res.status()).toBe(400);
  });

  test("enforces the password policy server-side", async ({ request }) => {
    const res = await post(request, "/api/auth/signup", {
      email: `short-${Date.now()}@example.invalid`,
      password: "abc",
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("WEAK_PASSWORD");
  });
});

test.describe("response hardening", () => {
  test("documents carry the strict production CSP", async ({ request }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"] ?? "";

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    // Production must not permit eval or inline script.
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("errors do not leak stack traces", async ({ request }) => {
    const res = await post(request, "/api/scans", { githubUrl: "http://127.0.0.1/a/b" });
    const body = await res.text();
    expect(body).not.toMatch(/at\s+\w+\s+\(.*[\\/]src[\\/]/);
    expect(body).not.toContain("node_modules");
  });
});
