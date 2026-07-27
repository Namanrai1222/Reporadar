import { test, expect } from "@playwright/test";
import { AppError } from "../../src/lib/config";
import {
  findExposedSecretEnvNames,
  normalizeRepoPath,
  parseGitHubRepoUrl,
  securityHeaders,
} from "../../src/lib/security";
import { assertSameOrigin, readAccessToken, ACCESS_COOKIE } from "../../src/lib/session";

/* ------------------------------------------------------------------ SSRF ---- */

test.describe("parseGitHubRepoUrl — SSRF allow-listing", () => {
  // The headline acceptance case: the EC2/GCP instance-metadata endpoint, which is
  // the usual payoff for an SSRF against a cloud-hosted scanner.
  test("refuses the cloud metadata address", () => {
    expect(() => parseGitHubRepoUrl("http://169.254.169.254/owner/repo")).toThrow(
      /private or internal network address/i,
    );
    expect(() => parseGitHubRepoUrl("http://169.254.169.254/latest/meta-data/iam/security-credentials/")).toThrow(
      /private or internal network address/i,
    );
  });

  const privateTargets = [
    "http://127.0.0.1/owner/repo",
    "http://localhost/owner/repo",
    "http://localhost:3000/owner/repo",
    "http://0.0.0.0/owner/repo",
    "http://10.0.0.5/owner/repo",
    "http://172.16.0.1/owner/repo",
    "http://172.31.255.254/owner/repo",
    "http://192.168.1.1/owner/repo",
    "http://[::1]/owner/repo",
  ];

  for (const target of privateTargets) {
    test(`refuses private/internal target ${target}`, () => {
      expect(() => parseGitHubRepoUrl(target)).toThrow(/private or internal network address/i);
    });
  }

  test("allows 172.32.x, which is outside the private range", () => {
    // Guards against an over-broad `172.*` rule — 172.32/12 is public space.
    expect(() => parseGitHubRepoUrl("http://172.32.0.1/owner/repo")).toThrow(/only public github\.com/i);
  });

  const offHostTargets = [
    "https://evil.example/owner/repo",
    // Suffix confusion: the host is evil.com, not github.com.
    "https://github.com.evil.example/owner/repo",
    // Credential-prefix confusion: the real host is still evil.example.
    "https://github.com@evil.example/owner/repo",
    "https://raw.githubusercontent.com/owner/repo",
  ];

  for (const target of offHostTargets) {
    test(`refuses non-GitHub host ${target}`, () => {
      expect(() => parseGitHubRepoUrl(target)).toThrow(/only public github\.com/i);
    });
  }

  test("refuses non-HTTP schemes", () => {
    expect(() => parseGitHubRepoUrl("file:///etc/passwd")).toThrow(/only https/i);
    expect(() => parseGitHubRepoUrl("gopher://127.0.0.1:11211/_stats")).toThrow(/only https/i);
  });

  test("rejects a malformed URL rather than throwing something unhandled", () => {
    expect(() => parseGitHubRepoUrl("not a url")).toThrow(/valid github repository url/i);
    expect(() => parseGitHubRepoUrl("")).toThrow(/valid github repository url/i);
  });

  test("neutralises path traversal instead of escaping github.com", () => {
    // The WHATWG URL parser resolves `..` before we ever see the path, so traversal
    // cannot walk off the host — it just names a different (nonexistent) repo. The
    // property that matters is that the resulting target is still a github.com repo.
    expect(parseGitHubRepoUrl("https://github.com/../../etc/passwd").url).toBe("https://github.com/etc/passwd");
    expect(parseGitHubRepoUrl("https://github.com/a/b/../../x/y").url).toBe("https://github.com/x/y");

    for (const input of ["https://github.com/../../etc/passwd", "https://github.com/a/b/../../x/y"]) {
      expect(parseGitHubRepoUrl(input).url.startsWith("https://github.com/")).toBe(true);
    }
  });

  test("requires both an owner and a repo", () => {
    expect(() => parseGitHubRepoUrl("https://github.com/owner")).toThrow(/owner\/repo/i);
    expect(() => parseGitHubRepoUrl("https://github.com/")).toThrow(/owner\/repo/i);
  });

  test("ignores trailing path segments like /tree/main", () => {
    expect(parseGitHubRepoUrl("https://github.com/owner/repo/tree/main/src")).toEqual({
      owner: "owner",
      name: "repo",
      url: "https://github.com/owner/repo",
    });
  });

  test("surfaces bad input as a 400, never a 500", () => {
    // errorResponse maps a plain Error to 500; only AppError carries a status, so a
    // regression here would turn user typos into server errors.
    try {
      parseGitHubRepoUrl("http://169.254.169.254/a/b");
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(400);
      expect((error as AppError).code).toBe("INVALID_REPOSITORY_URL");
    }
  });

  test("accepts legitimate GitHub URLs", () => {
    expect(parseGitHubRepoUrl("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      name: "next.js",
      url: "https://github.com/vercel/next.js",
    });
    expect(parseGitHubRepoUrl("git@github.com:vercel/next.js.git").owner).toBe("vercel");
    expect(parseGitHubRepoUrl("https://www.github.com/vercel/next.js").name).toBe("next.js");
  });
});

test.describe("normalizeRepoPath", () => {
  test("rejects traversal and absolute paths", () => {
    expect(() => normalizeRepoPath("../../etc/passwd")).toThrow(/unsafe/i);
    expect(() => normalizeRepoPath("/etc/passwd")).toThrow(/unsafe/i);
    expect(() => normalizeRepoPath("src/\0evil.ts")).toThrow(/unsafe/i);
    expect(normalizeRepoPath("src\\lib\\a.ts")).toBe("src/lib/a.ts");
  });
});

/* ------------------------------------------------- NEXT_PUBLIC_ exposure ---- */

test.describe("findExposedSecretEnvNames", () => {
  test("flags secret-shaped public vars", () => {
    const found = findExposedSecretEnvNames({
      NEXT_PUBLIC_STRIPE_SECRET_KEY: "sk_live_x",
      NEXT_PUBLIC_GROQ_API_KEY: "gsk_x",
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "sb_secret",
      NEXT_PUBLIC_GITHUB_TOKEN: "ghp_x",
    });

    expect(found).toEqual(
      expect.arrayContaining([
        "NEXT_PUBLIC_STRIPE_SECRET_KEY",
        "NEXT_PUBLIC_GROQ_API_KEY",
        "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
        "NEXT_PUBLIC_GITHUB_TOKEN",
      ]),
    );
  });

  test("does not flag public-by-design values or server-only secrets", () => {
    expect(
      findExposedSecretEnvNames({
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_pub_x",
        NEXT_PUBLIC_APP_URL: "https://app.example",
        SUPABASE_SERVICE_ROLE_KEY: "sb_secret_x",
        GROQ_API_KEY: "gsk_x",
      }),
    ).toEqual([]);
  });

  test("ignores empty values so a placeholder in .env.example is not fatal", () => {
    expect(findExposedSecretEnvNames({ NEXT_PUBLIC_SOME_API_KEY: "" })).toEqual([]);
  });
});

/* ---------------------------------------------------------------- headers ---- */

test.describe("securityHeaders", () => {
  test("locks down framing, sniffing and base URI", () => {
    const csp = securityHeaders()["Content-Security-Policy"];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("default-src 'self'");
    expect(securityHeaders()["X-Content-Type-Options"]).toBe("nosniff");
  });

  test("connect-src permits the app's own origin and GitHub", () => {
    const csp = securityHeaders()["Content-Security-Policy"];
    const connect = csp.split(";").find((part) => part.trim().startsWith("connect-src"));
    expect(connect).toBeTruthy();
    expect(connect).toContain("'self'");
    expect(connect).toContain("https://api.github.com");
  });

  test("includes the Supabase origin in connect-src when configured", () => {
    // Regression guard for the auth outage: omitting this origin silently blocked
    // every browser-side GoTrue call.
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    try {
      expect(securityHeaders()["Content-Security-Policy"]).toContain("https://project-ref.supabase.co");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });
});

/* ------------------------------------------------------------------ CSRF ---- */

function post(origin?: string) {
  return new Request("http://localhost:3000/api/scans", {
    method: "POST",
    headers: origin ? { origin } : {},
  });
}

test.describe("assertSameOrigin", () => {
  test("accepts the app's own origin", () => {
    expect(() => assertSameOrigin(post("http://localhost:3000"))).not.toThrow();
  });

  test("rejects a foreign origin", () => {
    expect(() => assertSameOrigin(post("https://evil.example"))).toThrow(/cross-origin/i);
  });

  test("rejects a null origin rather than failing open", () => {
    expect(() => assertSameOrigin(post())).toThrow(/missing origin/i);
  });

  test("reports CSRF rejections as 403", () => {
    try {
      assertSameOrigin(post("https://evil.example"));
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(403);
    }
  });

  test("honours the forwarded host set by a reverse proxy", () => {
    const request = new Request("http://internal-pod:8080/api/scans", {
      method: "POST",
      headers: {
        origin: "https://reporadar.example",
        "x-forwarded-host": "reporadar.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
});

/* -------------------------------------------------------------- cookies ---- */

test.describe("readAccessToken", () => {
  test("reads the session cookie and ignores others", () => {
    const request = new Request("http://localhost:3000/api/scans", {
      headers: { cookie: `theme=dark; ${ACCESS_COOKIE}=jwt-value; other=x` },
    });
    expect(readAccessToken(request)).toBe("jwt-value");
  });

  test("returns null when absent or empty", () => {
    expect(readAccessToken(new Request("http://localhost:3000/"))).toBeNull();
    expect(
      readAccessToken(new Request("http://localhost:3000/", { headers: { cookie: `${ACCESS_COOKIE}=` } })),
    ).toBeNull();
  });

  test("does not confuse a cookie whose name merely ends with the session name", () => {
    const request = new Request("http://localhost:3000/", {
      headers: { cookie: `not_${ACCESS_COOKIE}=attacker-value` },
    });
    expect(readAccessToken(request)).toBeNull();
  });
});
