'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Check, Clock, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import { AppPage, EmptyState } from '@/components/ui/AppPage';

const STAGES = [
  { id: 'queued', label: 'Queued for worker' },
  { id: 'cloning', label: 'Fetching repository metadata' },
  { id: 'parsing', label: 'Downloading bounded source sample' },
  { id: 'retrieval', label: 'Collecting masked evidence' },
  { id: 'llm_synthesis', label: 'Generating AI synthesis' },
  { id: 'completed', label: 'Analysis complete' },
] as const;

type PollScan = {
  id: string;
  repo_owner: string;
  repo_name: string;
  github_url: string;
  mode: string;
  status: string;
  stage: string;
  error_message: string | null;
  report_id?: string | null;
};

function stageIndex(scan: PollScan | null) {
  if (!scan) return 0;
  const stage = scan.stage === 'completed_with_errors' ? 'completed' : scan.stage;
  const index = STAGES.findIndex((item) => item.id === stage);
  return index >= 0 ? index : 0;
}

function isTerminal(scan: PollScan | null) {
  return Boolean(scan && ['completed', 'completed_with_errors', 'failed', 'cancelled'].includes(scan.status));
}

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scanId = searchParams.get('id') ?? '';
  const fallbackRepo = searchParams.get('repo') ?? 'Queued repository scan';
  const [scan, setScan] = useState<PollScan | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!scanId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await authFetch(`/api/scans/${encodeURIComponent(scanId)}`);
        if (response.status === 401) {
          router.push(`/signin?next=${encodeURIComponent(`/scan?id=${encodeURIComponent(scanId)}`)}`);
          return;
        }

        const body = (await response.json().catch(() => ({}))) as {
          scan?: PollScan;
          error?: string;
        };

        if (!active) return;
        if (!response.ok || !body.scan) {
          setError(body.error ?? 'Could not load scan status.');
          return;
        }

        setScan(body.scan);
        if ((body.scan.status === 'completed' || body.scan.status === 'completed_with_errors') && body.scan.report_id) {
          router.replace(`/report/${encodeURIComponent(body.scan.report_id)}`);
          return;
        }

        if (body.scan.status === 'failed' || body.scan.status === 'cancelled') {
          setError(body.scan.error_message ?? 'Scan failed before a report could be generated.');
          return;
        }

        timer = setTimeout(poll, 2000);
      } catch {
        if (active) setError('Network error while checking scan status.');
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [router, scanId]);

  const activeIndex = stageIndex(scan);
  const completed = useMemo(() => new Set(STAGES.slice(0, activeIndex).map((stage) => stage.id)), [activeIndex]);
  const progress = isTerminal(scan)
    ? scan?.status === 'failed' || scan?.status === 'cancelled'
      ? Math.max(10, Math.round((activeIndex / STAGES.length) * 100))
      : 100
    : Math.round((activeIndex / (STAGES.length - 1)) * 100);
  const repoLabel = scan ? `${scan.repo_owner}/${scan.repo_name}` : fallbackRepo;

  if (!scanId) {
    return (
      <AppPage fig="FIG.02 — SCAN WORKER" icon={Clock} title="Scan status" subtitle="Live progress for a running scan">
        <EmptyState
          icon={AlertTriangle}
          title="No scan selected"
          body="Start a scan from New Scan and its progress will show here."
          ctaHref="/dashboard"
          ctaLabel="New scan"
        />
      </AppPage>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bp-ground)] lg:flex-row">
      <div className="bp-paper flex flex-1 flex-col px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto w-full max-w-lg">
          <p className="bp-label mb-2">FIG.02 — SCAN WORKER</p>
          <h1 className="text-[20px] font-semibold text-[var(--bp-ink)]">Analyzing repository</h1>
          <p className="mt-1 truncate bp-mono text-[12.5px] text-[var(--bp-ink-dim)]">{repoLabel}</p>

          <div className="mt-6 mb-9">
            <div className="mb-1.5 flex items-center justify-between bp-mono text-[10px] text-[var(--bp-line)]">
              <span>PROGRESS</span>
              <span>{progress}%</span>
            </div>
            <div
              className="relative h-[6px] border border-[var(--bp-line-faint)]"
              role="progressbar"
              aria-label="Scan progress"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="absolute inset-y-0 left-0 bg-[var(--bp-line)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ol className="flex flex-col">
            {STAGES.map((stage, index) => {
              const done = completed.has(stage.id) || (scan?.status === 'completed' && index === STAGES.length - 1);
              const active = index === activeIndex && !done && !error;

              return (
                <li key={stage.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center border transition-colors duration-300 ${
                        done
                          ? 'border-[var(--bp-line)] bg-[var(--bp-line)]'
                          : active
                            ? 'border-[var(--bp-line)]'
                            : 'border-[var(--bp-line-faint)]'
                      }`}
                    >
                      {done ? (
                        <Check className="h-3 w-3 text-[var(--bp-ground)]" strokeWidth={2.5} />
                      ) : active ? (
                        <Loader2 className="h-3 w-3 animate-spin text-[var(--bp-line)]" />
                      ) : null}
                    </span>
                    {index < STAGES.length - 1 && (
                      <span
                        className={`mt-1 h-8 w-px transition-colors duration-300 ${
                          done ? 'bg-[var(--bp-line-soft)]' : 'bg-[var(--bp-line-faint)]'
                        }`}
                      />
                    )}
                  </div>

                  <div className="pb-8">
                    <p
                      className={`bp-mono text-[12.5px] transition-colors duration-300 ${
                        done
                          ? 'text-[var(--bp-ink-dim)]'
                          : active
                            ? 'text-[var(--bp-ink)]'
                            : 'text-[color-mix(in_oklab,var(--bp-ink-dim)_50%,transparent)]'
                      }`}
                    >
                      <span className="mr-2 text-[10px] text-[var(--bp-line)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {stage.label}
                    </p>
                    {done && <p className="mt-0.5 bp-mono text-[10px] text-[var(--bp-line)]">[OK]</p>}
                  </div>
                </li>
              );
            })}
          </ol>

          {error && (
            <div
              role="alert"
              className="mt-2 flex items-start gap-2 border border-[color-mix(in_oklab,var(--bp-critical)_45%,transparent)] bg-[color-mix(in_oklab,var(--bp-critical)_10%,transparent)] px-4 py-3 bp-mono text-[12px] text-[var(--bp-critical)]"
            >
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {error}
            </div>
          )}
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col border-t border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] p-5 md:p-6 lg:w-[380px] lg:border-l lg:border-t-0">
        <p className="bp-label mb-1">WORKER STATUS</p>
        <p className="mb-4 text-[11.5px] text-[var(--bp-ink-dim)]">
          This page polls the persisted scan row. No source code is stored.
        </p>

        <div className="flex flex-col gap-2 bp-mono text-[11.5px]">
          <div className="border border-[var(--bp-line-faint)] p-3 text-[var(--bp-ink-dim)]">
            <span className="text-[var(--bp-line)]">SCAN</span> {scanId}
          </div>
          <div className="border border-[var(--bp-line-faint)] p-3 text-[var(--bp-ink-dim)]">
            <span className="text-[var(--bp-line)]">STATUS</span> {scan?.status ?? 'waiting'}
          </div>
          <div className="flex items-center gap-2 border border-[var(--bp-line-faint)] p-3 text-[var(--bp-ink-dim)]">
            <Clock className="h-3.5 w-3.5 text-[var(--bp-line)]" strokeWidth={1.5} />
            {isTerminal(scan) ? 'Worker finished.' : 'Polling every 2 seconds.'}
          </div>
        </div>

        <p className="mt-auto border-t border-[var(--bp-line-faint)] pt-4 bp-mono text-[10px] leading-relaxed text-[color-mix(in_oklab,var(--bp-ink-dim)_70%,transparent)]">
          AI explanations summarize deterministic scanner output and may contain false positives.
        </p>
      </aside>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bp-ground)]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--bp-line-faint)] border-t-[var(--bp-line)]" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
