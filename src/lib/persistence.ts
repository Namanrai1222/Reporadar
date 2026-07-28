import type { Finding, Report, ScanMode } from "./types";
import { AppError, getConfig, isSupabaseConfigured } from "./config";
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
  /** Report was written, but a later step failed — the results are still readable. */
  | "completed_with_errors"
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
  /** Populated by listScans via a related embed; null while a scan has no report yet. */
  report_id?: string | null;
}

export interface SavedReportSummary {
  reportId: string;
  savedAt: string;
  repoOwner: string;
  repoName: string;
  mode: string;
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
  getUserPlan(userId: string): Promise<string>;
  listSavedReports(userId: string): Promise<SavedReportSummary[]>;
  saveReportBookmark(userId: string, reportId: string): Promise<void>;
  removeReportBookmark(userId: string, reportId: string): Promise<void>;
  isReportSaved(userId: string, reportId: string): Promise<boolean>;
}

export function createPersistenceAdapter(): PersistenceAdapter {
  if (!isSupabaseConfigured(getConfig())) {
    return new LocalDisabledPersistenceAdapter();
  }

  return new SupabasePersistenceAdapter();
}

const enc = encodeURIComponent;

/**
 * All Supabase queries here run with the service-role key, which BYPASSES RLS.
 * Ownership is therefore enforced in application code by the `user_id=eq.` filters
 * below. This guard makes it impossible to run a scoped query with an empty user id
 * (which would otherwise silently return another user's rows), so a forgotten filter
 * fails loudly instead of leaking data. RLS in schema.sql remains as defense-in-depth.
 */
function requireUserId(userId: string): void {
  if (!userId) {
    throw new AppError("AUTH_REQUIRED", "A user id is required for owner-scoped queries.", 401);
  }
}

interface EmbedScan {
  repo_owner: string;
  repo_name: string;
  mode: string;
}
interface EmbedReport {
  scans: EmbedScan | EmbedScan[] | null;
}
interface SavedRow {
  report_id: string;
  created_at: string;
  reports: EmbedReport | EmbedReport[] | null;
}

/** PostgREST returns to-one embeds as an object, but can return arrays — normalize both. */
function firstOf<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
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
    requireUserId(input.userId);
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
      query: `id=eq.${enc(id)}`,
      prefer: "return=minimal",
      body: patch,
    });
  }

  async saveReport(scanId: string, userId: string, report: Report) {
    requireUserId(userId);
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
    requireUserId(userId);

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
    requireUserId(userId);
    const rows = await this.db.table<PersistedReport>("reports", {
      query: `id=eq.${enc(reportId)}&user_id=eq.${enc(userId)}&limit=1`,
    });

    return rows[0]?.report_json ?? null;
  }

  async listScans(userId: string) {
    requireUserId(userId);
    const rows = await this.db.table<PersistedScan & { reports?: Array<{ id: string }> | { id: string } | null }>(
      "scans",
      {
        query: `user_id=eq.${enc(userId)}&select=*,reports(id)&order=created_at.desc&limit=25`,
      },
    );

    return rows.map((row) => {
      const { reports, ...scan } = row;
      return { ...scan, report_id: firstOf(reports)?.id ?? null } satisfies PersistedScan;
    });
  }

  async getUserPlan(userId: string) {
    requireUserId(userId);
    const rows = await this.db.table<{ plan_tier: string }>("users", {
      query: `id=eq.${enc(userId)}&select=plan_tier&limit=1`,
    });
    return rows[0]?.plan_tier ?? "free";
  }

  async listSavedReports(userId: string) {
    requireUserId(userId);
    const rows = await this.db.table<SavedRow>("saved_reports", {
      query: `user_id=eq.${enc(userId)}&select=report_id,created_at,reports(scans(repo_owner,repo_name,mode))&order=created_at.desc&limit=50`,
    });

    return rows.map((row) => {
      const report = firstOf(row.reports);
      const scan = firstOf(report?.scans);
      return {
        reportId: row.report_id,
        savedAt: row.created_at,
        repoOwner: scan?.repo_owner ?? "repository",
        repoName: scan?.repo_name ?? row.report_id,
        mode: scan?.mode ?? "full-map",
      } satisfies SavedReportSummary;
    });
  }

  async saveReportBookmark(userId: string, reportId: string) {
    requireUserId(userId);
    await this.db.table("saved_reports", {
      method: "POST",
      query: "on_conflict=user_id,report_id",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: { user_id: userId, report_id: reportId },
    });
  }

  async removeReportBookmark(userId: string, reportId: string) {
    requireUserId(userId);
    await this.db.table("saved_reports", {
      method: "DELETE",
      query: `user_id=eq.${enc(userId)}&report_id=eq.${enc(reportId)}`,
      prefer: "return=minimal",
    });
  }

  async isReportSaved(userId: string, reportId: string) {
    requireUserId(userId);
    const rows = await this.db.table<{ report_id: string }>("saved_reports", {
      query: `user_id=eq.${enc(userId)}&report_id=eq.${enc(reportId)}&select=report_id&limit=1`,
    });
    return rows.length > 0;
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

  async getUserPlan() {
    return "free";
  }

  async listSavedReports() {
    return [];
  }

  async saveReportBookmark() {}

  async removeReportBookmark() {}

  async isReportSaved() {
    return false;
  }
}
