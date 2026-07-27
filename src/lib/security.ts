import type { Severity } from "./types";
import { AppError } from "./config";

/** Malformed or disallowed scan target — a client error, never a 500. */
function invalidRepoUrl(message: string) {
  return new AppError("INVALID_REPOSITORY_URL", message, 400);
}

export const SECURITY_LIMITS = {
  maxFilesInTree: 5000,
  maxDownloadedFiles: 80,
  maxIndividualFileBytes: 200_000,
  maxTotalDownloadedBytes: 5_000_000,
  githubTimeoutMs: 12_000,
  maxAiInputCharacters: 360_000,
  anonymousAnalysesPerDay: 3,
  maxConcurrentJobsPerUser: 1,
};

/**
 * `NEXT_PUBLIC_*` values are inlined into the client bundle at build time, so any
 * secret carrying that prefix is world-readable. Rather than denylisting a handful
 * of known key names (which silently misses `NEXT_PUBLIC_STRIPE_SECRET_KEY`, and
 * every future provider), match the *shape* of a secret and allowlist the few
 * public-by-design values.
 */
const PUBLIC_BY_DESIGN = new Set([
  "NEXT_PUBLIC_APP_URL",
  // The Supabase anon key is intended to be shipped to browsers; it carries no
  // privileges of its own and is constrained by row-level security.
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]);

const SECRET_SHAPED = /(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|CREDENTIAL|API_KEY|_TOKEN|ACCESS_KEY)/i;

/** Names of `NEXT_PUBLIC_*` vars that look like secrets. Exported for testing. */
export function findExposedSecretEnvNames(env: Record<string, string | undefined> = process.env): string[] {
  return Object.keys(env)
    .filter((name) => name.startsWith("NEXT_PUBLIC_"))
    .filter((name) => !PUBLIC_BY_DESIGN.has(name))
    .filter((name) => SECRET_SHAPED.test(name))
    .filter((name) => Boolean(env[name]));
}

export function assertSafeServerEnvironment() {
  const unsafe = findExposedSecretEnvNames();
  if (unsafe.length > 0) {
    throw new Error(
      `Refusing to run: ${unsafe.join(", ")} use the NEXT_PUBLIC_ prefix, which bundles them into ` +
        `client-side JavaScript. Remove the prefix so they stay server-only.`,
    );
  }
}

const ALLOWED_REPO_HOSTS = new Set(["github.com", "www.github.com"]);

/**
 * Hostnames that must never be fetched, even if some future refactor widens the
 * host allow-list.
 *
 * Covers loopback, link-local (including the 169.254.169.254 cloud metadata
 * endpoint), and the RFC 1918 private ranges. This is belt-and-braces: the scanner
 * never fetches a user-supplied URL directly — it extracts `owner`/`repo` and
 * interpolates them into hardcoded `api.github.com` and `raw.githubusercontent.com`
 * URLs — so SSRF is structurally prevented rather than filtered. The explicit check
 * exists so the guarantee is named, tested, and survives that structure changing.
 */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") return true;
  // IPv6 loopback and IPv4-mapped loopback.
  if (host === "::1" || host.startsWith("::ffff:127.")) return true;
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10).
  if (/^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const [a, b] = ipv4.slice(1).map(Number);
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function parseGitHubRepoUrl(input: string) {
  let url: URL;

  try {
    const normalized = input.trim().replace(/^git@github\.com:/, "https://github.com/");
    url = new URL(normalized);
  } catch {
    throw invalidRepoUrl("Enter a valid GitHub repository URL.");
  }

  // Reject non-HTTP schemes outright (file:, gopher:, data: …).
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw invalidRepoUrl("Only https:// GitHub repository URLs are supported.");
  }

  if (isPrivateHost(url.hostname)) {
    throw invalidRepoUrl("Refusing to fetch a private or internal network address.");
  }

  if (!ALLOWED_REPO_HOSTS.has(url.hostname.toLowerCase())) {
    throw invalidRepoUrl("Only public github.com repositories are supported.");
  }

  const [owner, repo] = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "").split("/");
  const safeName = /^[A-Za-z0-9_.-]+$/;

  if (!owner || !repo || !safeName.test(owner) || !safeName.test(repo)) {
    throw invalidRepoUrl("Enter a public GitHub repository URL like https://github.com/owner/repo.");
  }

  return {
    owner,
    name: repo,
    url: `https://github.com/${owner}/${repo}`,
  };
}

export function normalizeRepoPath(path: string) {
  const normalized = path.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    normalized.includes("../") ||
    normalized.includes("..\\") ||
    normalized.includes("\0")
  ) {
    throw new Error(`Unsafe repository path rejected: ${path}`);
  }
  return normalized;
}

export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 2)}...masked`;
  }

  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

export function maskEvidence(line: string) {
  return line
    .replace(/sk-(live|test|proj)-[A-Za-z0-9_-]{12,}/g, (match) => maskSecret(match))
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, (match) => maskSecret(match))
    .replace(/ghp_[A-Za-z0-9]{20,}/g, (match) => maskSecret(match))
    .replace(/AKIA[0-9A-Z]{16}/g, (match) => maskSecret(match))
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, (match) => maskSecret(match))
    .replace(/xox[baprs]-[0-9A-Za-z-]{12,}/g, (match) => maskSecret(match))
    .replace(/postgres:\/\/[^\s"'`]+/g, (match) => maskSecret(match))
    .replace(/mongodb\+srv:\/\/[^\s"'`]+/g, (match) => maskSecret(match));
}

export function severityRank(severity: Severity) {
  return {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  }[severity];
}

export function escapeMarkdown(value: string) {
  return value.replaceAll("|", "\\|").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * Origin of the Supabase project, derived from the configured URL.
 *
 * Allowed in `connect-src`. This was originally the cause of a total auth outage:
 * sign-in, sign-up and refresh were browser-initiated `fetch` calls to Supabase's
 * GoTrue endpoints, and because this origin was missing the browser blocked every
 * one of them before it left the page. The failure surfaced as a generic network
 * error ("Could not reach the authentication server") for *both* valid and invalid
 * credentials — because the request never actually happened.
 *
 * Those calls are now server-proxied through `/api/auth/*`, so `'self'` covers the
 * password flow. The entry is retained for the OAuth redirect handshake and so that
 * any future direct Supabase client (realtime, storage) does not silently fail the
 * same way.
 */
export function supabaseOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function securityHeaders() {
  const isDev = process.env.NODE_ENV !== "production";
  // Next.js dev (Turbopack/HMR) evaluates code with eval() and injects inline
  // bootstrap scripts, which a strict `script-src 'self'` blocks — preventing
  // hydration. Relax only in development; production stays strict.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self'";

  const connectSrc = ["'self'", "https://api.github.com", supabaseOrigin()]
    .filter(Boolean)
    .join(" ");

  return {
    "Content-Security-Policy":
      `default-src 'self'; img-src 'self' data: https://avatars.githubusercontent.com; connect-src ${connectSrc}; ${scriptSrc}; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

