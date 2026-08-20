import type { Report, ScanMode, ScanRequest } from "./types";
import { fetchPublicGitHubRepo } from "./github";
import { buildReport, demoReport } from "./report";
import { getUserFromRequest } from "./auth";
import { AppError, getConfig, isSupabaseConfigured } from "./config";
import { createCacheAdapter, buildReportCacheKey } from "./cache";
import { createLlmProvider } from "./llm";
import { createTrace, emitTelemetry } from "./observability";
import { createPersistenceAdapter } from "./persistence";
import { retrieveArtifacts, applySynthesis, RETRIEVAL_VERSION } from "./retrieval";
import { assertSafeServerEnvironment, parseGitHubRepoUrl } from "./security";
import { createQueueAdapter, createQueueJob } from "./queue";
import { beginConcurrentJob, clientFingerprint, consumeDailyScan, dailyLimitForPlan, humanizeReset, refundDailyScan } from "./rate-limit";

const MODES: ScanMode[] = ["full-map", "security-lens", "onboarding"];
const SCANNER_VERSION = "rules-v1";
const PROMPT_VERSION = "synthesis-v1";

export async function createScan(request: Request) {
  assertSafeServerEnvironment();

  const payload = sanitizeScanPayload((await request.json()) as Partial<ScanRequest>);
  const user = await getUserFromRequest(request);
  const trace = createTrace(user?.id);
  const persistence = createPersistenceAdapter();
  const queue = createQueueAdapter();

  emitTelemetry(trace, "scan.create.received", {
    mode: payload.mode,
    authenticated: Boolean(user),
    persistenceConfigured: persistence.configured,
    queueConfigured: queue.configured,
  });

  if (payload.githubUrl === "demo") {
    const report = demoReport();
    emitTelemetry(trace, "scan.demo.completed", { findings: report.findings.length });
    return {
      report,
      traceId: trace.traceId,
      queued: false,
      persisted: false,
      stages: completedStages(),
      productNotice:
        "Demo scans are not persisted. We never store your source code, only analysis results and metadata can be saved to your account.",
    };
  }

  // Validate the target *before* the auth check. The parse is a pure syntax and
  // host check with no I/O, and doing it first means a malformed or internal-network
  // target (169.254.169.254, localhost, 10.x …) is refused on its own merits rather
  // than being masked by a 401 — which keeps the SSRF control independently testable.
  const parsed = parseGitHubRepoUrl(payload.githubUrl);

  if (isSupabaseConfigured(getConfig()) && !user) {
    throw new AppError("AUTH_REQUIRED", "Sign in to run persisted repository scans.", 401);
  }

  const config = getConfig();

  // ── Rate limiting: daily budget (by plan for users, by IP for anonymous) ──
  if (user) {
    const plan = await persistence.getUserPlan(user.id);
    const limit = dailyLimitForPlan(plan);
    const daily = await consumeDailyScan(user.id, "user", limit);
    emitTelemetry(trace, "scan.ratelimit", { kind: "user", used: daily.used, limit, allowed: daily.allowed });
    if (!daily.allowed) {
      throw new AppError("RATE_LIMITED", `Daily scan limit reached (${limit}/day). Resets ${humanizeReset(daily.resetAt)}.`, 429);
    }
  } else {
    const fingerprint = clientFingerprint(request);
    const limit = config.rateLimits.anonymousPerDay;
    const daily = await consumeDailyScan(fingerprint, "anonymous", limit);
    emitTelemetry(trace, "scan.ratelimit", { kind: "anonymous", used: daily.used, limit, allowed: daily.allowed });
    if (!daily.allowed) {
      throw new AppError("RATE_LIMITED", `Anonymous scan limit reached (${limit}/day). Sign in to run more.`, 429);
    }
  }

  // ── Concurrency guard (authenticated users only) ──
  const concurrency = user ? await beginConcurrentJob(user.id, config.rateLimits.maxConcurrentPerUser) : null;
  if (concurrency && !concurrency.allowed) {
    throw new AppError("RATE_LIMITED", "You already have a scan running. Wait for it to finish before starting another.", 429);
  }

  // Identifies the budget to refund if the scan never produces a report.
  const quotaSubject = user ? { subject: user.id, kind: "user" as const } : { subject: clientFingerprint(request), kind: "anonymous" as const };
  let scanSucceeded = false;
  // Written by runScanImmediately. A scan can persist a report and *then* throw
  // (the `completed_with_errors` case); the throw alone does not mean the user
  // got nothing, so the refund decision needs this rather than just the reject.
  const outcome = { reportPersisted: false };

  try {
    const scan = user
      ? await persistence.createScan({
          userId: user.id,
          githubUrl: parsed.url,
          owner: parsed.owner,
          name: parsed.name,
          branch: payload.branch ?? "default",
          mode: payload.mode,
          traceId: trace.traceId,
        })
      : null;

    trace.scanId = scan?.id;
    const queued = await queue.enqueue(createQueueJob(payload, trace.traceId, scan?.id));
    emitTelemetry(trace, "scan.queue.enqueued", { provider: queued.provider, jobId: queued.jobId });

    const report = await runScanImmediately(payload, user?.id, scan?.id, trace.traceId, outcome);
    scanSucceeded = true;
    return {
      report,
      traceId: trace.traceId,
      queued: queue.configured,
      persisted: persistence.configured && Boolean(user),
      stages: completedStages(),
      productNotice:
        "We never store your source code; only masked analysis results, metadata, and generated reports can be saved to your account.",
    };
  } catch (error) {
    // Surface the underlying cause. Without this the real exception (GitHub
    // outage, LLM failure, persistence error) is only ever seen as a generic
    // message in the browser, leaving nothing to diagnose from.
    console.error(
      `[scan] failed trace=${trace.traceId} repo=${parsed.owner}/${parsed.name} mode=${payload.mode}:`,
      error,
    );
    throw error;
  } finally {
    // The daily budget is spent before the work starts, so a scan that never
    // produced a report must hand its unit back. A scan that persisted a report
    // and then failed keeps its charge — the user has readable results.
    if (!scanSucceeded && !outcome.reportPersisted) {
      await refundDailyScan(quotaSubject.subject, quotaSubject.kind);
    }
    await concurrency?.release();
  }
}

/**
 * `outcome` reports back across the throw boundary: the caller cannot otherwise
 * tell a scan that produced nothing from one that persisted a report and then
 * tripped on a later step, and the two are charged differently.
 */
async function runScanImmediately(
  payload: ScanRequest,
  userId?: string,
  scanId?: string,
  traceId?: string,
  outcome: { reportPersisted: boolean } = { reportPersisted: false },
): Promise<Report> {
  const trace = { traceId: traceId ?? "local-trace", startedAt: Date.now(), userId, scanId };
  const persistence = createPersistenceAdapter();
  const cache = createCacheAdapter();
  const provider = createLlmProvider();
  try {
    if (scanId) await persistence.updateScan(scanId, { status: "cloning", stage: "cloning" });
    const source = await fetchPublicGitHubRepo(payload.githubUrl, payload.branch);

    const cacheKey = buildReportCacheKey({
      repo: `${source.repo.owner}/${source.repo.name}`,
      commitOrBranch: source.repo.branch,
      mode: payload.mode,
      model: provider.model,
      scannerVersion: SCANNER_VERSION,
      retrievalVersion: RETRIEVAL_VERSION,
      promptVersion: PROMPT_VERSION,
    });

    const cached = await cache.get<Report>(cacheKey);
    if (cached) {
      emitTelemetry(trace, "scan.cache.hit", { provider: "redis-rest" });
      return cached;
    }

    if (scanId) await persistence.updateScan(scanId, { status: "parsing", stage: "parsing" });
    const deterministicReport = buildReport(source.repo, source.files, payload.mode, source.treeCount);

    if (scanId) await persistence.updateScan(scanId, { status: "retrieval", stage: "retrieval" });
    const artifacts = retrieveArtifacts(source.files, deterministicReport.findings);

    if (scanId) await persistence.updateScan(scanId, { status: "llm_synthesis", stage: "llm_synthesis" });
    const synthesis = await provider.synthesize({ report: deterministicReport, artifacts });
    const report = applySynthesis(deterministicReport, synthesis.text);

    await cache.set(cacheKey, report, 60 * 60 * 24);

    if (userId && scanId && persistence.configured) {
      await persistence.saveFindings(scanId, userId, report.findings);
      await persistence.saveReport(scanId, userId, report);
      outcome.reportPersisted = true;
      await persistence.updateScan(scanId, {
        status: "completed",
        stage: "completed",
        completed_at: new Date().toISOString(),
      });
    }

    emitTelemetry(trace, "scan.completed", {
      findings: report.findings.length,
      provider: synthesis.telemetry.provider,
      tokens: synthesis.telemetry.estimatedTokens,
      cacheConfigured: cache.configured,
    });

    return report;
  } catch (error) {
    if (scanId) {
      await persistence.updateScan(scanId, {
        status: outcome.reportPersisted ? "completed_with_errors" : "failed",
        stage: outcome.reportPersisted ? "completed_with_errors" : "failed",
        error_code: error instanceof AppError ? error.code : "SCAN_FAILED",
        error_message: error instanceof Error ? error.message : "Scan failed.",
      });
    }
    throw error;
  }
}

export function sanitizeScanPayload(payload: Partial<ScanRequest>): ScanRequest {
  const githubUrl = String(payload.githubUrl ?? "").trim();
  const mode = MODES.includes(payload.mode as ScanMode) ? (payload.mode as ScanMode) : "full-map";
  const branch = payload.branch ? String(payload.branch).trim() : undefined;

  if (!githubUrl) {
    throw new AppError("INVALID_REPOSITORY_URL", "Enter a public GitHub repository URL.", 400);
  }

  return {
    githubUrl,
    branch,
    mode,
    includeDependencyAdvisories: Boolean(payload.includeDependencyAdvisories),
  };
}

export function completedStages() {
  return [
    "queued",
    "cloning",
    "parsing",
    "building_structure",
    "security_analysis",
    "retrieval",
    "llm_synthesis",
    "completed",
  ];
}

