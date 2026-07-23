import type { RepoFile, RepoIdentity } from "./types";
import { SECURITY_LIMITS, normalizeRepoPath, parseGitHubRepoUrl } from "./security";

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

export async function fetchPublicGitHubRepo(githubUrl: string, requestedBranch?: string) {
  const parsed = parseGitHubRepoUrl(githubUrl);
  const repoApiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.name}`;
  const repoResponse = await githubFetch(repoApiUrl);

  if (!repoResponse.ok) {
    if (repoResponse.status === 404) {
      throw new Error("We could not access this repository. Check the link and visibility.");
    }
    throw new Error("GitHub rejected the repository request. Try again shortly.");
  }

  const repoData = (await repoResponse.json()) as GitHubRepoResponse;
  const branch = requestedBranch?.trim() || repoData.default_branch;
  const treeUrl = `${repoApiUrl}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const treeResponse = await githubFetch(treeUrl);

  if (!treeResponse.ok) {
    throw new Error("Selected branch could not be scanned.");
  }

  const treeData = (await treeResponse.json()) as GitHubTreeResponse;
  if (treeData.tree.length > SECURITY_LIMITS.maxFilesInTree) {
    throw new Error(`This repository exceeds the scan limit of ${SECURITY_LIMITS.maxFilesInTree} files.`);
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

  const files: RepoFile[] = [];
  let totalBytes = 0;

  for (const item of candidates) {
    if (totalBytes >= SECURITY_LIMITS.maxTotalDownloadedBytes) {
      break;
    }

    const content = await fetchRawFile(parsed.owner, parsed.name, branch, item.path);
    const size = Buffer.byteLength(content, "utf8");
    totalBytes += size;
    files.push({
      path: normalizeRepoPath(item.path),
      content,
      size,
      language: languageForPath(item.path),
    });
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

