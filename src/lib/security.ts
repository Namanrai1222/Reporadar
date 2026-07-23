import type { Severity } from "./types";

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

const DANGEROUS_PUBLIC_ENV = [
  "NEXT_PUBLIC_GEMINI_API_KEY",
  "NEXT_PUBLIC_GROQ_API_KEY",
  "NEXT_PUBLIC_OPENAI_API_KEY",
  "NEXT_PUBLIC_GITHUB_TOKEN",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
];

export function assertSafeServerEnvironment() {
  const unsafe = DANGEROUS_PUBLIC_ENV.filter((name) => Boolean(process.env[name]));
  if (unsafe.length > 0) {
    throw new Error(`Unsafe public secret environment variable(s): ${unsafe.join(", ")}`);
  }
}

export function parseGitHubRepoUrl(input: string) {
  let url: URL;

  try {
    const normalized = input.trim().replace(/^git@github\.com:/, "https://github.com/");
    url = new URL(normalized);
  } catch {
    throw new Error("Enter a valid GitHub repository URL.");
  }

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("Only public github.com repositories are supported.");
  }

  const [owner, repo] = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "").split("/");
  const safeName = /^[A-Za-z0-9_.-]+$/;

  if (!owner || !repo || !safeName.test(owner) || !safeName.test(repo)) {
    throw new Error("Enter a public GitHub repository URL like https://github.com/owner/repo.");
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

export function securityHeaders() {
  const isDev = process.env.NODE_ENV !== "production";
  // Next.js dev (Turbopack/HMR) evaluates code with eval() and injects inline
  // bootstrap scripts, which a strict `script-src 'self'` blocks — preventing
  // hydration. Relax only in development; production stays strict.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self'";

  return {
    "Content-Security-Policy":
      `default-src 'self'; img-src 'self' data: https://avatars.githubusercontent.com; connect-src 'self' https://api.github.com; ${scriptSrc}; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

