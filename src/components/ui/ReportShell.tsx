'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Star, GitFork, Globe, Map, Shield, GitMerge, Leaf, BookOpen, Download, ArrowLeft,
  Bookmark, BookmarkCheck, Loader2,
} from 'lucide-react';
import type { Report } from '@/lib/types';
import { RepoRadarLogo } from '@/components/brand/RepoRadarLogo';
import { authFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/use-auth';

const NAV_ITEMS = [
  { href: '', label: 'Overview', icon: Globe },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/findings', label: 'Findings', icon: Shield },
  { href: '/routes', label: 'Routes', icon: GitMerge },
  { href: '/environment', label: 'Environment', icon: Leaf },
  { href: '/onboarding', label: 'Onboarding', icon: BookOpen },
];

export function ReportShell({
  children,
  report,
  reportId,
  initialSaved = false,
}: {
  children: React.ReactNode;
  report: Report | null;
  reportId: string;
  initialSaved?: boolean;
}) {
  const pathname = usePathname();
  const { authenticated } = useAuth();
  const [saved, setSaved] = useState(initialSaved);
  const [savePending, setSavePending] = useState(false);
  const [saveNote, setSaveNote] = useState('');

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  async function toggleSave() {
    setSaveNote('');
    setSavePending(true);
    try {
      const res = await authFetch(`/api/reports/${reportId}/save`, { method: saved ? 'DELETE' : 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { saved?: boolean };
        setSaved(Boolean(data.saved));
      } else if (res.status === 404) {
        setSaveNote('Only saved scans can be bookmarked.');
      } else if (res.status === 401) {
        setSaveNote('Sign in to save reports.');
      } else {
        setSaveNote('Could not update bookmark.');
      }
    } catch {
      setSaveNote('Could not update bookmark.');
    } finally {
      setSavePending(false);
    }
  }

  function exportMarkdown() {
    if (!report) return;
    const blob = new Blob([report.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${report.repo.owner}-${report.repo.name}-reporadar.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const basePath = `/report/${reportId}`;

  const criticalCount = report?.findings.filter((f) => f.severity === 'critical').length ?? 0;
  const highCount = report?.findings.filter((f) => f.severity === 'high').length ?? 0;

  // Tabs are plain paths. They used to carry the report payload forward as a
  // `?data=` parameter so each tab could render without re-fetching; every tab
  // switch therefore wrote the full findings list into browser history.
  const navHref = (suffix: string) => `${basePath}${suffix}`;

  const isActive = (suffix: string) => {
    const full = `${basePath}${suffix}`;
    if (suffix === '') return pathname === basePath;
    return pathname.startsWith(full);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bp-ground)]">
      <header className="sticky top-0 z-30 border-b border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-5 pt-3 md:px-6">
          {/* top strip */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" aria-label="RepoRadar home" className="hidden sm:block">
                <RepoRadarLogo size={24} wordClassName="text-[13px]" />
              </Link>
              <Link
                href="/history"
                className="inline-flex items-center gap-1.5 bp-mono text-[11px] text-[var(--bp-ink-dim)] transition-colors hover:text-[var(--bp-ink)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                History
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {saveNote && <span className="bp-mono text-[10px] text-[var(--bp-ink-dim)]">{saveNote}</span>}
              {authenticated && (
                <button
                  type="button"
                  onClick={toggleSave}
                  disabled={savePending}
                  className="inline-flex items-center gap-2 border border-[var(--bp-line-faint)] px-3 py-1.5 bp-mono text-[11px] text-[var(--bp-ink-dim)] transition-colors hover:border-[var(--bp-line)] hover:text-[var(--bp-ink)] disabled:opacity-50"
                >
                  {savePending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  ) : saved ? (
                    <BookmarkCheck className="h-3.5 w-3.5 text-[var(--bp-line)]" strokeWidth={1.5} />
                  ) : (
                    <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  {saved ? 'Saved' : 'Save'}
                </button>
              )}
              <button
                type="button"
                onClick={exportMarkdown}
                disabled={!report}
                className="inline-flex items-center gap-2 border border-[var(--bp-line-faint)] px-3 py-1.5 bp-mono text-[11px] text-[var(--bp-ink-dim)] transition-colors hover:border-[var(--bp-line)] hover:text-[var(--bp-ink)] disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                Export
              </button>
            </div>
          </div>

          {/* repo identity */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href={report?.repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bp-mono text-[15px] font-medium text-[var(--bp-ink)] transition-colors hover:text-[var(--bp-line)]"
            >
              {report ? `${report.repo.owner}/${report.repo.name}` : reportId}
            </a>
            {report?.repo.branch && (
              <span className="border border-[var(--bp-line-faint)] px-1.5 py-0.5 bp-mono text-[10px] text-[var(--bp-ink-dim)]">
                {report.repo.branch}
              </span>
            )}
            {report?.repo.primaryLanguage && (
              <span className="bp-mono text-[11px] text-[var(--bp-ink-dim)]">{report.repo.primaryLanguage}</span>
            )}
            {report?.repo.stars !== undefined && (
              <span className="flex items-center gap-1 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
                <Star className="h-3 w-3" strokeWidth={1.5} />
                {report.repo.stars.toLocaleString()}
              </span>
            )}
            {report?.repo.forks !== undefined && (
              <span className="flex items-center gap-1 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
                <GitFork className="h-3 w-3" strokeWidth={1.5} />
                {report.repo.forks.toLocaleString()}
              </span>
            )}
            {criticalCount > 0 && (
              <span
                className="border px-2 py-0.5 bp-mono text-[10px]"
                style={{ color: 'var(--bp-critical)', borderColor: 'color-mix(in oklab, var(--bp-critical) 40%, transparent)' }}
              >
                {criticalCount} CRITICAL
              </span>
            )}
            {highCount > 0 && (
              <span
                className="border px-2 py-0.5 bp-mono text-[10px]"
                style={{ color: 'var(--bp-alert)', borderColor: 'color-mix(in oklab, var(--bp-alert) 40%, transparent)' }}
              >
                {highCount} HIGH
              </span>
            )}
          </div>
          {report?.repo.description && (
            <p className="mt-2 max-w-2xl text-[13px] text-[var(--bp-ink-dim)]">{report.repo.description}</p>
          )}

          {/* tabs */}
          <nav className="-mb-px mt-4 flex items-center gap-0 overflow-x-auto">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={navHref(href)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 bp-mono text-[12px] transition-colors md:px-4 ${
                    active
                      ? 'border-[var(--bp-line)] text-[var(--bp-line)]'
                      : 'border-transparent text-[var(--bp-ink-dim)] hover:text-[var(--bp-ink)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {label}
                  {href === '/findings' && report && report.findings.length > 0 && (
                    <span className="ml-1 border border-[var(--bp-line-faint)] px-1.5 py-px text-[10px] text-[var(--bp-ink-dim)]">
                      {report.findings.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6 md:px-6">{children}</main>
    </div>
  );
}
