'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, ArrowRight, Loader2 } from 'lucide-react';
import { AppPage, EmptyState } from '@/components/ui/AppPage';
import { authFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/use-auth';

interface ScanRow {
  id: string;
  repo_owner: string;
  repo_name: string;
  mode: string;
  status: string;
  created_at: string;
  report_id: string | null;
}

type View = 'loading' | 'anon' | 'empty' | 'ready' | 'error';

function StatusPill({ status }: { status: string }) {
  // `completed_with_errors` still has a readable report behind it, so it reads
  // as a warning rather than a failure — and the raw enum is not shown to users.
  const { color, label, title } =
    status === 'completed'
      ? { color: 'var(--bp-line)', label: 'completed', title: undefined }
      : status === 'completed_with_errors'
        ? {
            color: 'var(--bp-alert)',
            label: 'partial',
            title: 'The report was generated, but some steps did not finish.',
          }
        : status === 'failed'
          ? { color: 'var(--bp-critical)', label: 'failed', title: undefined }
          : { color: 'var(--bp-ink-dim)', label: status, title: undefined };

  return (
    <span
      title={title}
      className="border px-1.5 py-0.5 bp-mono text-[10px] uppercase"
      style={{ color, borderColor: `color-mix(in oklab, ${color} 40%, transparent)` }}
    >
      {label}
    </span>
  );
}

export default function HistoryPage() {
  const { ready } = useAuth();
  const [view, setView] = useState<View>('loading');
  const [scans, setScans] = useState<ScanRow[]>([]);

  useEffect(() => {
    if (!ready) return;
    // No `setView('loading')` here — that is already the initial state, and the
    // effect only runs once `ready` flips, so writing it synchronously would
    // just be a redundant render.
    let active = true;
    authFetch('/api/scans')
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) return setView('anon');
        if (!res.ok) return setView('error');
        const data = (await res.json()) as { scans?: ScanRow[] };
        const list = data.scans ?? [];
        setScans(list);
        setView(list.length ? 'ready' : 'empty');
      })
      .catch(() => {
        if (active) setView('error');
      });
    return () => {
      active = false;
    };
  }, [ready]);

  return (
    <AppPage fig="FIG.02 — LOG" icon={History} title="Scan History" subtitle="Previously analyzed repositories">
      {view === 'loading' && (
        <div className="flex flex-1 items-center justify-center p-16">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--bp-line)]" strokeWidth={1.5} />
        </div>
      )}

      {view === 'anon' && (
        <EmptyState
          icon={History}
          title="Sign in to view history"
          body="Your scan history is saved to your account. Sign in to see it here."
          ctaHref="/signin"
          ctaLabel="Sign in"
        />
      )}

      {view === 'empty' && (
        <EmptyState
          icon={History}
          title="No scan history yet"
          body="Run a scan from the dashboard to see your analysis history here."
          ctaHref="/dashboard"
          ctaLabel="Start a new scan"
        />
      )}

      {view === 'error' && (
        <EmptyState
          icon={History}
          title="Couldn't load history"
          body="Something went wrong fetching your scans. Check your connection and try again."
          ctaHref="/history"
          ctaLabel="Retry"
        />
      )}

      {view === 'ready' && (
        <div className="p-5 md:p-8">
          <div className="flex flex-col divide-y divide-[var(--bp-line-faint)] border border-[var(--bp-line-faint)]">
            {scans.map((scan) => {
              const name = `${scan.repo_owner}/${scan.repo_name}`;
              const date = new Date(scan.created_at).toLocaleString();
              const row = (
                <div className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--bp-line)_5%,transparent)]">
                  <div className="min-w-0">
                    <p className="truncate bp-mono text-[13px] text-[var(--bp-ink)]">{name}</p>
                    <div className="mt-1 flex items-center gap-2 bp-mono text-[10.5px] text-[var(--bp-ink-dim)]">
                      <span>{scan.mode}</span>
                      <span>·</span>
                      <span>{date}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusPill status={scan.status} />
                    {scan.report_id && <ArrowRight className="h-4 w-4 text-[var(--bp-line)]" strokeWidth={1.5} />}
                  </div>
                </div>
              );
              return scan.report_id ? (
                <Link key={scan.id} href={`/report/${scan.report_id}`}>
                  {row}
                </Link>
              ) : (
                <div key={scan.id}>{row}</div>
              );
            })}
          </div>
        </div>
      )}
    </AppPage>
  );
}
