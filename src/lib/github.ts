import type { RepoFile, RepoIdentity } from "./types";
import { SECURITY_LIMITS, normalizeRepoPath, parseGitHubRepoUrl } from "./security";
import { AppError } from "./config";

interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
  url: string;
}

interface GitHubRepoResponse {
  default_branch: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[];
  truncated: boolean;
}

const IMPORTANT_PATTERNS = [
  /^README\.md$/i,
  /^package\.json$/i,
  /^next\.config\./i,
  /^vite\.config\./i,
  /^tsconfig\.json$/i,
  /^tailwind\.config\./i,
  /^\.env\.example$/i,
  /^app\/api\/.*\/route\.(ts|js)$/i,
  /^pages\/api\/.*\.(ts|js)$/i,
  /^src\/.*\.(ts|tsx|js|jsx)$/i,
  /^app\/.*\.(ts|tsx|js|jsx)$/i,
  /^components\/.*\.(ts|tsx|js|jsx)$/i,
  /^lib\/.*\.(ts|tsx|js|jsx)$/i,
  /^server\/.*\.(ts|tsx|js|jsx)$/i,
  /^prisma\/schema\.prisma$/i,
];

const IGNORED_PATH_PARTS = [
  ".git/",
  "node_modules/",
  "dist/",
  "build/",
  ".next/",
  "coverage/",
  ".turbo/",
  ".cache/",
  "vendor/",
];

const TEXT_EXTENSIONS = /\.(md|txt|json|js|jsx|ts|tsx|mjs|cjs|css|scss|html|py|go|rs|java|rb|php|yml|yaml|toml|env|prisma)$/i;

/**
 * How many raw file downloads run at once. Raw content comes from
 * `raw.githubusercontent.com`, which is not subject to the REST API's hourly
 * quota, so this is bounded for politeness and memory rather than rate limits.
 */
const RAW_FETCH_CONCURRENCY = 8;

/**
 * Format an `x-ratelimit-reset` header for display.
 *
 * `Number(null)` is 0 rather than NaN, so a missing header would otherwise pass
 * a plain isFinite check and render the epoch. A value beyond the Date range
 * (±8.64e15 ms) makes `toISOString()` throw a RangeError, which inside an error
 * path would replace a clear rate-limit message with an opaque 500.
 */
function formatResetTime(header: string | null): string {
  if (header === null) return "shortly";
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds <= 0) return "shortly";

  const ms = seconds * 1000;
  if (Math.abs(ms) > 8.64e15) return "shortly";
  try {
    return new Date(ms).toISOString();
  } catch {
    return "shortly";
  }
}

/**
 * Turn a failed GitHub API response into a typed error.
 *
 * Shared by every GitHub call so a rate limit hit while fetching the tree is
 * reported the same way as one hit while fetching the repository, rather than
 * collapsing into a generic SCAN_FAILED.
 */
function githubResponseError(response: Response, notFoundMessage: string, context: string): AppError {
  if (response.status === 404) {
    return new AppError("REPO_NOT_FOUND", notFoundMessage, 404);
  }

  // Unauthenticated GitHub API calls share a 60/hour budget across the whole
  // server, so this is the first thing to fail under any real use. Say so
  // plainly instead of "try again shortly" — the fix is a GITHUB_TOKEN, and
  // the reset time is the only useful thing to wait for.
  if (response.status === 403 || response.status === 429) {
    if (response.headers.get("x-ratelimit-remaining") === "0") {
      const resetsAt = formatResetTime(response.headers.get("x-ratelimit-reset"));
      return new AppError(
        "GITHUB_RATE_LIMITED",
        `GitHub's API rate limit is exhausted (resets at ${resetsAt}). Set GITHUB_TOKEN to raise the limit from 60 to 5000 requests/hour.`,
        503,
      );
    }
    return new AppError("GITHUB_FORBIDDEN", `GitHub refused the ${context} request.`, 502);
  }

  return new AppError("GITHUB_UNAVAILABLE", `GitHub rejected the ${context} request. Try again shortly.`, 502);
}

export async function fetchPublicGitHubRepo(githubUrl: string, requestedBranch?: string) {
  const parsed = parseGitHubRepoUrl(githubUrl);
  const repoApiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.name}`;
  const repoResponse = await githubFetch(repoApiUrl);

  if (!repoResponse.ok) {
    throw githubResponseError(
      repoResponse,
      "We could not access this repository. Check the link and that the repository is public.",
      "repository",
    );
  }

  const repoData = (await repoResponse.json()) as GitHubRepoResponse;
  const branch = requestedBranch?.trim() || repoData.default_branch;
  const treeUrl = `${repoApiUrl}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const treeResponse = await githubFetch(treeUrl);

  if (!treeResponse.ok) {
    // Classified like the repository call: a rate limit or outage hit here is
    // the same failure, and reporting it as a generic error lost the code.
    throw githubResponseError(
      treeResponse,
      `The branch "${branch}" could not be found in this repository.`,
      "branch",
    );
  }

  const treeData = (await treeResponse.json()) as GitHubTreeResponse;
  if (treeData.tree.length > SECURITY_LIMITS.maxFilesInTree) {
    throw new AppError(
      "REPO_TOO_LARGE",
      `This repository exceeds the scan limit of ${SECURITY_LIMITS.maxFilesInTree} files.`,
      413,
    );
  }

  const identity: RepoIdentity = {
    owner: parsed.owner,
    name: parsed.name,
    branch,
    url: parsed.url,
    description: repoData.description ?? undefined,
    primaryLanguage: repoData.language ?? undefined,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
  };

  const candidates = rankFiles(treeData.tree.filter((item) => item.type === "blob"))
    .filter((item) => !isIgnored(item.path))
    .filter((item) => TEXT_EXTENSIONS.test(item.path))
    .filter((item) => (item.size ?? 0) <= SECURITY_LIMITS.maxIndividualFileBytes)
    .slice(0, SECURITY_LIMITS.maxDownloadedFiles);

  // Downloaded with bounded parallelism. Fetching these one at a time meant a
  // round-trip (~0.9s) per file and up to `maxDownloadedFiles` of them, so a
  // normal repository took over a minute in raw network wait alone — long enough
  // that the request was routinely cut off before a response could be written,
  // which surfaced in the browser as "Unexpected end of JSON input".
  //
  // The byte budget is still enforced, but it is now checked as results land
  // rather than before each request, so the cap holds without serialising.
  const files: RepoFile[] = [];
  let totalBytes = 0;
  let budgetExhausted = false;

  for (let i = 0; i < candidates.length; i += RAW_FETCH_CONCURRENCY) {
    if (budgetExhausted) break;

    const batch = candidates.slice(i, i + RAW_FETCH_CONCURRENCY);
    const contents = await Promise.all(
      batch.map((item) => fetchRawFile(parsed.owner, parsed.name, branch, item.path)),
    );

    for (const [index, content] of contents.entries()) {
      if (totalBytes >= SECURITY_LIMITS.maxTotalDownloadedBytes) {
        budgetExhausted = true;
        break;
      }
      const size = Buffer.byteLength(content, "utf8");
      totalBytes += size;
      files.push({
        path: normalizeRepoPath(batch[index].path),
        content,
        size,
        language: languageForPath(batch[index].path),
      });
    }
  }

  return {
    repo: identity,
    treeCount: treeData.tree.length,
    files,
    truncated: treeData.truncated,
  };
}

async function fetchRawFile(owner: string, repo: string, branch: string, path: string) {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const response = await githubFetch(rawUrl);
  if (!response.ok) {
    return "";
  }
  return response.text();
}

function githubFetch(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SECURITY_LIMITS.githubTimeoutMs);

  return fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "RepoRadar-MVP",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
}

function rankFiles(files: GitHubTreeItem[]) {
  return [...files].sort((left, right) => scoreFile(right) - scoreFile(left));
}

function scoreFile(file: GitHubTreeItem) {
  const path = file.path;
  let score = 0;
  if (IMPORTANT_PATTERNS.some((pattern) => pattern.test(path))) score += 20;
  if (/app\/api\/.*\/route\.(ts|js)$/i.test(path) || /pages\/api\/.*\.(ts|js)$/i.test(path)) score += 30;
  if (/middleware\.(ts|js)$/i.test(path)) score += 25;
  if (/(auth|db|database|stripe|payment|mail|storage)/i.test(path)) score += 18;
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(path)) score += 6;
  score -= Math.min((file.size ?? 0) / 50_000, 8);
  return score;
}

function isIgnored(path: string) {
  return IGNORED_PATH_PARTS.some((part) => path.includes(part)) || /\.min\.(js|css)$/i.test(path);
}

function languageForPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return (
    {
      ts: "TypeScript",
      tsx: "TypeScript React",
      js: "JavaScript",
      jsx: "JavaScript React",
      py: "Python",
      go: "Go",
      rs: "Rust",
      md: "Markdown",
      json: "JSON",
      prisma: "Prisma",
    }[extension ?? ""] ?? "Text"
  );
}

