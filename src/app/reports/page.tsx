'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, ArrowRight, Loader2 } from 'lucide-react';
import { AppPage, EmptyState } from '@/components/ui/AppPage';
import { authFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/use-auth';

interface SavedRow {
  reportId: string;
  savedAt: string;
  repoOwner: string;
  repoName: string;
  mode: string;
}

type View = 'loading' | 'anon' | 'empty' | 'ready' | 'error';

export default function ReportsPage() {
  const { ready } = useAuth();
  const [view, setView] = useState<View>('loading');
  const [reports, setReports] = useState<SavedRow[]>([]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setView('loading');
    authFetch('/api/saved-reports')
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) return setView('anon');
        if (!res.ok) return setView('error');
        const data = (await res.json()) as { savedReports?: SavedRow[] };
        const list = data.savedReports ?? [];
        setReports(list);
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
    <AppPage fig="FIG.03 — ARCHIVE" icon={FolderOpen} title="Saved Reports" subtitle="Bookmarked analysis results">
      {view === 'loading' && (
        <div className="flex flex-1 items-center justify-center p-16">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--bp-line)]" strokeWidth={1.5} />
        </div>
      )}

      {view === 'anon' && (
        <EmptyState
          icon={FolderOpen}
          title="Sign in to view saved reports"
          body="Bookmarked reports are saved to your account. Sign in to see them here."
          ctaHref="/signin"
          ctaLabel="Sign in"
        />
      )}

      {view === 'empty' && (
        <EmptyState
          icon={FolderOpen}
          title="No saved reports"
          body="Open a report and use Save to bookmark it here for quick access."
          ctaHref="/dashboard"
          ctaLabel="Run a scan"
        />
      )}

      {view === 'error' && (
        <EmptyState
          icon={FolderOpen}
          title="Couldn't load saved reports"
          body="Something went wrong. Check your connection and try again."
          ctaHref="/reports"
          ctaLabel="Retry"
        />
      )}

      {view === 'ready' && (
        <div className="p-5 md:p-8">
          <div className="flex flex-col divide-y divide-[var(--bp-line-faint)] border border-[var(--bp-line-faint)]">
            {reports.map((report) => (
              <Link key={report.reportId} href={`/report/${report.reportId}`}>
                <div className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--bp-line)_5%,transparent)]">
                  <div className="min-w-0">
                    <p className="truncate bp-mono text-[13px] text-[var(--bp-ink)]">
                      {report.repoOwner}/{report.repoName}
                    </p>
                    <div className="mt-1 flex items-center gap-2 bp-mono text-[10.5px] text-[var(--bp-ink-dim)]">
                      <span>{report.mode}</span>
                      <span>·</span>
                      <span>saved {new Date(report.savedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--bp-line)]" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AppPage>
  );
}
