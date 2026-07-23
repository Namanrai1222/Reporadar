import type { Finding, Report, ScanMode } from "./types";
import { getConfig, isSupabaseConfigured } from "./config";
import { SupabaseRestClient } from "./supabase-rest";

export type DbScanStatus =
  | "queued"
  | "cloning"
  | "parsing"
  | "building_structure"
  | "security_analysis"
  | "retrieval"
  | "llm_synthesis"
  | "completed"
  | "failed"
  | "cancelled";

export interface PersistedScan {
  id: string;
  user_id: string;
  repo_owner: string;
  repo_name: string;
  github_url: string;
  branch: string;
  mode: ScanMode;
  status: DbScanStatus;
  stage: DbScanStatus;
  trace_id: string;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface PersistedReport {
  id: string;
  scan_id: string;
  user_id: string;
  report_json: Report;
  report_markdown: string;
  created_at: string;
}

export interface PersistenceAdapter {
  configured: boolean;
  createScan(input: {
    userId: string;
    githubUrl: string;
    owner: string;
    name: string;
    branch: string;
    mode: ScanMode;
    traceId: string;
  }): Promise<PersistedScan | null>;
  updateScan(id: string, patch: Partial<PersistedScan>): Promise<void>;
  saveReport(scanId: string, userId: string, report: Report): Promise<void>;
  saveFindings(scanId: string, userId: string, findings: Finding[]): Promise<void>;
  getReport(reportId: string, userId: string): Promise<Report | null>;
  listScans(userId: string): Promise<PersistedScan[]>;
}

export function createPersistenceAdapter(): PersistenceAdapter {
  if (!isSupabaseConfigured(getConfig())) {
    return new LocalDisabledPersistenceAdapter();
  }

  return new SupabasePersistenceAdapter();
}

class SupabasePersistenceAdapter implements PersistenceAdapter {
  configured = true;
  private db = new SupabaseRestClient();

  async createScan(input: {
    userId: string;
    githubUrl: string;
    owner: string;
    name: string;
    branch: string;
    mode: ScanMode;
    traceId: string;
  }) {
    const rows = await this.db.table<PersistedScan>("scans", {
      method: "POST",
      prefer: "return=representation",
      body: {
        user_id: input.userId,
        repo_owner: input.owner,
        repo_name: input.name,
        github_url: input.githubUrl,
        branch: input.branch,
        mode: input.mode,
        status: "queued",
        stage: "queued",
        trace_id: input.traceId,
      },
    });

    return rows[0] ?? null;
  }

  async updateScan(id: string, patch: Partial<PersistedScan>) {
    await this.db.table("scans", {
      method: "PATCH",
      query: `id=eq.${encodeURIComponent(id)}`,
      prefer: "return=minimal",
      body: patch,
    });
  }

  async saveReport(scanId: string, userId: string, report: Report) {
    await this.db.table("reports", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        id: report.id,
        scan_id: scanId,
        user_id: userId,
        report_json: report,
        report_markdown: report.markdown,
      },
    });
  }

  async saveFindings(scanId: string, userId: string, findings: Finding[]) {
    if (findings.length === 0) return;

    await this.db.table("findings", {
      method: "POST",
      prefer: "return=minimal",
      body: findings.map((finding) => ({
        id: finding.id,
        scan_id: scanId,
        user_id: userId,
        rule_id: finding.ruleId,
        category: finding.category,
        severity: finding.severity,
        confidence: finding.confidence,
        title: finding.title,
        file_path: finding.filePath,
        line_number: finding.lineNumber,
        evidence: finding.evidence,
        explanation: finding.explanation,
        suggested_fix: finding.suggestedFix,
        status: finding.status,
        related_node_ids: finding.relatedNodeIds,
      })),
    });
  }

  async getReport(reportId: string, userId: string) {
    const rows = await this.db.table<PersistedReport>("reports", {
      query: `id=eq.${encodeURIComponent(reportId)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    });

    return rows[0]?.report_json ?? null;
  }

  async listScans(userId: string) {
    return this.db.table<PersistedScan>("scans", {
      query: `user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=25`,
    });
  }
}

class LocalDisabledPersistenceAdapter implements PersistenceAdapter {
  configured = false;

  async createScan() {
    return null;
  }

  async updateScan() {}

  async saveReport() {}

  async saveFindings() {}

  async getReport() {
    return null;
  }

  async listScans() {
    return [];
  }
}
