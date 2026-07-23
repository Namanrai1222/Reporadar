import type { Finding, Report, RepoFile } from "./types";
import { maskEvidence } from "./security";

export const RETRIEVAL_VERSION = "metadata-v1";

export interface RetrievedArtifact {
  filePath: string;
  symbol?: string;
  reason: string;
  excerpt: string;
}

export function retrieveArtifacts(files: RepoFile[], findings: Finding[]): RetrievedArtifact[] {
  const selected = new Map<string, RetrievedArtifact>();

  for (const finding of findings.slice(0, 20)) {
    const file = files.find((candidate) => candidate.path === finding.filePath);
    if (!file) continue;

    selected.set(finding.filePath, {
      filePath: finding.filePath,
      reason: `${finding.ruleId} ${finding.category}`,
      excerpt: maskedExcerpt(file.content, finding.lineNumber),
    });
  }

  for (const file of files) {
    if (selected.size >= 30) break;
    if (/README\.md$|package\.json$|next\.config\.|vite\.config\.|middleware\./i.test(file.path)) {
      selected.set(file.path, {
        filePath: file.path,
        reason: "important metadata file",
        excerpt: maskedExcerpt(file.content, 1),
      });
    }
  }

  return [...selected.values()];
}

export function applySynthesis(report: Report, synthesis: string): Report {
  if (!synthesis) return report;

  return {
    ...report,
    markdown: `${report.markdown}\n\n## LLM Synthesis\n\n${synthesis}`,
  };
}

function maskedExcerpt(content: string, lineNumber: number) {
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, lineNumber - 3);
  const excerpt = lines.slice(start, start + 5).join("\n");
  return maskEvidence(excerpt).slice(0, 1600);
}

