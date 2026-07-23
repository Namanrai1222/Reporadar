import type { Finding, Report, RepoFile, RepoIdentity, RiskPath, ScanMode, Severity } from "./types";
import { escapeMarkdown, severityRank } from "./security";
import { analyzeFiles } from "./scanners";

const SAMPLE_FILES: RepoFile[] = [
  {
    path: "app/dashboard/page.tsx",
    language: "TypeScript React",
    size: 211,
    content: `"use client";
export default function Dashboard() {
  const key = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;
  fetch("/api/missing");
  return <main>Dashboard</main>;
}`,
  },
  {
    path: "app/api/users/[id]/route.ts",
    language: "TypeScript",
    size: 403,
    content: `export async function DELETE(request: Request, { params }) {
  const body = await request.json();
  await db.query(\`DELETE FROM users WHERE id = \${params.id}\`);
  return Response.json({ ok: true });
}`,
  },
  {
    path: "src/lib/config.ts",
    language: "TypeScript",
    size: 120,
    content: `export const stripe = "sk-live-1234567890abcdefghijklmnop";`,
  },
  {
    path: ".env.example",
    language: "Text",
    size: 40,
    content: "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
  },
];

export function buildReport(repo: RepoIdentity, files: RepoFile[], mode: ScanMode, filesFound = files.length): Report {
  const analysis = analyzeFiles(files.length > 0 ? files : SAMPLE_FILES);
  const stack = detectStack(files);
  const sortedFindings = [...analysis.findings].sort((left, right) => {
    return severityRank(right.severity) - severityRank(left.severity);
  });
  const riskPaths = buildRiskPaths(sortedFindings);
  const id = `${repo.owner}-${repo.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const report: Report = {
    id,
    repo,
    mode,
    createdAt: new Date().toISOString(),
    stack,
    coverage: {
      filesFound,
      filesAnalyzed: files.length,
      filesIgnored: Math.max(filesFound - files.length, 0),
      scannersCompleted: 10,
      maskedSecrets: sortedFindings.filter((finding) => finding.category === "secret_leak").length,
    },
    nodes: analysis.nodes,
    edges: analysis.edges,
    findings: sortedFindings,
    riskPaths,
    markdown: "",
  };

  return {
    ...report,
    markdown: toMarkdown(report),
  };
}

export function demoReport(): Report {
  return buildReport(
    {
      owner: "reporadar-demo",
      name: "intentionally-vulnerable-storefront",
      branch: "main",
      url: "https://github.com/reporadar-demo/intentionally-vulnerable-storefront",
      description: "Safe seeded fixture for RepoRadar portfolio demos",
      primaryLanguage: "TypeScript",
      stars: 42,
      forks: 7,
    },
    SAMPLE_FILES,
    "security-lens",
    124,
  );
}

export function toMarkdown(report: Report) {
  const lines = [
    `# RepoRadar Security Report: ${report.repo.owner}/${report.repo.name}`,
    "",
    `Generated: ${report.createdAt}`,
    `Branch: ${report.repo.branch}`,
    `Mode: ${report.mode}`,
    "",
    "## Static Analysis Disclaimer",
    "",
    "RepoRadar provides static analysis and AI-assisted explanations. Findings may include false positives or false negatives and should be reviewed by a developer.",
    "",
    "## Coverage",
    "",
    `- Files found: ${report.coverage.filesFound}`,
    `- Files analyzed: ${report.coverage.filesAnalyzed}`,
    `- Files ignored: ${report.coverage.filesIgnored}`,
    `- Scanner checks completed: ${report.coverage.scannersCompleted}`,
    "",
    "## Findings",
    "",
    "| Severity | Confidence | Rule | Location | Finding |",
    "| --- | --- | --- | --- | --- |",
    ...report.findings.map((finding) => {
      const location = `${finding.filePath}:${finding.lineNumber}`;
      return `| ${finding.severity} | ${finding.confidence} | ${finding.ruleId} | ${escapeMarkdown(location)} | ${escapeMarkdown(finding.title)} |`;
    }),
    "",
    "## Priority Risk Paths",
    "",
    ...report.riskPaths.map((path) => `- ${path.severity}: ${path.path.join(" -> ")}. ${path.assessment}`),
  ];

  return lines.join("\n");
}

function detectStack(files: RepoFile[]) {
  const paths = files.map((file) => file.path);
  const packageJson = files.find((file) => file.path === "package.json")?.content ?? "";
  const stack = new Set<string>();

  if (paths.some((path) => path.startsWith("app/")) || packageJson.includes("next")) stack.add("Next.js");
  if (paths.some((path) => path.endsWith(".ts") || path.endsWith(".tsx"))) stack.add("TypeScript");
  if (packageJson.includes("tailwind")) stack.add("Tailwind CSS");
  if (paths.some((path) => path.includes("prisma/schema.prisma"))) stack.add("Prisma");
  if (packageJson.includes("supabase")) stack.add("Supabase");
  if (packageJson.includes("vitest")) stack.add("Vitest");
  if (packageJson.includes("jest")) stack.add("Jest");

  return stack.size > 0 ? [...stack] : ["Repository source", "Static analysis"];
}

function buildRiskPaths(findings: Finding[]): RiskPath[] {
  return findings
    .filter((finding) => ["critical", "high", "medium"].includes(finding.severity))
    .slice(0, 5)
    .map((finding, index) => ({
      id: `risk-path-${index + 1}`,
      severity: finding.severity as Severity,
      title: finding.title,
      findingId: finding.id,
      path: riskPathForFinding(finding),
      assessment: finding.explanation,
    }));
}

function riskPathForFinding(finding: Finding) {
  if (finding.category === "frontend_secret_exposure") {
    return ["client bundle", finding.filePath, "environment token"];
  }

  if (finding.category === "auth" || finding.category === "validation" || finding.category === "sql_injection") {
    return ["public request", finding.filePath, "data operation"];
  }

  if (finding.category === "broken_api_link") {
    return ["frontend call", finding.evidence, "missing route"];
  }

  return ["repository source", finding.filePath, finding.ruleId];
}

