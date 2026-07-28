'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Radar, GitBranch, ArrowRight, Lock, Map, BookOpen, Shield, Sparkles,
  Clock, Key, Link2, Leaf, FileText, AlertTriangle,
} from 'lucide-react';
import { GlobalRail } from '@/components/ui/GlobalRail';
import { authFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/use-auth';

const SCAN_MODES = [
  {
    id: 'full-map',
    icon: Map,
    label: 'Full Map',
    code: 'A',
    description: 'Interactive code map, security scan, and API dependency graph.',
    accent: 'var(--bp-line)',
  },
  {
    id: 'security-lens',
    icon: Shield,
    label: 'Security Lens',
    code: 'B',
    description: 'Deep vulnerability scan, secret detection, and risk paths.',
    accent: 'var(--bp-alert)',
  },
  {
    id: 'onboarding',
    icon: BookOpen,
    label: 'Onboarding',
    code: 'C',
    description: 'AI-generated documentation and architecture walkthrough.',
    accent: 'var(--bp-ink)',
  },
] as const;

const EXAMPLE_REPOS = [
  'https://github.com/vercel/next.js',
  'https://github.com/facebook/react',
  'https://github.com/shadcn-ui/ui',
];

interface RecentScan {
  id: string;
  name: string;
  mode: string;
  time: string;
  reportId: string | null;
  url: string;
}

const DETECTS = [
  { icon: Key, text: 'Leaked secrets & API keys' },
  { icon: Map, text: 'Interactive code maps' },
  { icon: Shield, text: 'Security vulnerabilities' },
  { icon: Link2, text: 'API dependency graphs' },
  { icon: Leaf, text: 'Environment variable audit' },
  { icon: FileText, text: 'Onboarding documentation' },
];

export default function HomePage() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [mode, setMode] = useState<'full-map' | 'security-lens' | 'onboarding'>('full-map');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { ready, authenticated } = useAuth();
  const [recent, setRecent] = useState<RecentScan[]>([]);

  useEffect(() => {
    // Signed out: nothing to fetch. The list is derived below rather than
    // cleared here, so no state is written synchronously during the effect.
    if (!ready || !authenticated) return;
    let active = true;
    authFetch('/api/scans')
      .then((res) => (res.ok ? res.json() : { scans: [] }))
      .then(
        (data: {
          scans?: Array<{
            id: string;
            repo_owner: string;
            repo_name: string;
            mode: string;
            created_at: string;
            github_url: string;
            report_id?: string | null;
          }>;
        }) => {
          if (!active) return;
          setRecent(
            (data.scans ?? []).slice(0, 4).map((s) => ({
              id: s.id,
              name: `${s.repo_owner}/${s.repo_name}`,
              mode: s.mode,
              time: new Date(s.created_at).toLocaleDateString(),
              reportId: s.report_id ?? null,
              url: s.github_url,
            })),
          );
        },
      )
      .catch(() => {
        if (active) setRecent([]);
      });
    return () => {
      active = false;
    };
  }, [ready, authenticated]);

  // Never surface a previous session's scans after sign-out.
  const visibleRecent = authenticated ? recent : [];

  async function handleScan(url?: string) {
    const targetUrl = url || githubUrl;
    if (!targetUrl.trim()) {
      setError('Please enter a public GitHub repository URL.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authFetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: targetUrl, branch: branch || undefined, mode }),
      });
      const data = await res.json();

      // Scanning a real repository requires an account; send the visitor to sign in
      // rather than showing a dead-end error.
      if (res.status === 401) {
        router.push('/signin');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Scan failed.');

      // Navigate by id only. The report is already persisted server-side, so the
      // report page fetches it through an authorisation-checked endpoint instead of
      // carrying findings and masked secrets through the address bar.
      router.push(`/report/${encodeURIComponent(data.report.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed. Please try again.');
      setLoading(false);
    }
  }

  function handleDemo() {
    handleScan('demo');
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bp-ground)] md:flex-row">
      <GlobalRail />

      <main className="flex flex-1 flex-col pb-20 md:pb-0">
        {/* Sheet header */}
        <div className="flex items-center justify-between border-b border-[var(--bp-line-faint)] px-5 py-4 md:px-8 md:py-5">
          <div>
            <p className="bp-label mb-1">FIG.01 — INPUT</p>
            <h1 className="text-[20px] font-semibold tracking-tight text-[var(--bp-ink)] md:text-[22px]">New Scan</h1>
          </div>
          <button
            onClick={handleDemo}
            className="inline-flex shrink-0 items-center gap-2 border border-[var(--bp-line-faint)] px-3 py-2 bp-mono text-[11px] tracking-wide text-[var(--bp-ink-dim)] transition-colors hover:border-[var(--bp-line)] hover:text-[var(--bp-ink)]"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
            Try demo
          </button>
        </div>

        <div className="flex flex-1">
          {/* Main input area */}
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-10 md:px-8">
            <div className="w-full">
              {/* Scanning a real repository is rejected server-side without an
                  account. Say so up front rather than after the submit. */}
              {ready && !authenticated && (
                <div className="mb-5 flex items-start gap-3 border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-line)_6%,transparent)] px-4 py-3">
                  <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--bp-line)]" strokeWidth={1.5} />
                  <p className="bp-mono text-[11.5px] leading-relaxed text-[var(--bp-ink-dim)]">
                    Scanning a repository requires an account.{' '}
                    <Link href="/signin" className="text-[var(--bp-line)] underline-offset-4 hover:underline">
                      Sign in
                    </Link>{' '}
                    to continue, or use <span className="text-[var(--bp-ink)]">Try demo</span> for a sample report.
                  </p>
                </div>
              )}

              <p className="bp-label mb-2">TARGET REPOSITORY</p>
              <div className="relative flex items-stretch border border-[var(--bp-line-soft)] bg-[color-mix(in_oklab,var(--bp-ground-2)_70%,transparent)] transition-colors focus-within:border-[var(--bp-line)]">
                <span className="bp-reg" style={{ top: -1, left: -1 }} />
                <span className="bp-reg tr" style={{ top: -1, right: -1 }} />
                <span className="bp-reg bl" style={{ bottom: -1, left: -1 }} />
                <span className="bp-reg br" style={{ bottom: -1, right: -1 }} />
                <span className="grid place-items-center pl-4 pr-3 text-[var(--bp-line)]">
                  <Radar className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  placeholder="https://github.com/owner/repository"
                  aria-label="GitHub repository URL"
                  className="w-full bg-transparent py-3.5 pr-4 bp-mono text-[14px] text-[var(--bp-ink)] outline-none placeholder:text-[color-mix(in_oklab,var(--bp-ink-dim)_55%,transparent)]"
                  disabled={loading}
                />
              </div>

              {/* Branch */}
              <div className="relative mt-2 flex items-stretch border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_50%,transparent)] transition-colors focus-within:border-[var(--bp-line-soft)]">
                <span className="grid place-items-center pl-4 pr-3 text-[var(--bp-ink-dim)]">
                  <GitBranch className="h-3.5 w-3.5" strokeWidth={1.5} />
                </span>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="branch — optional, defaults to main"
                  aria-label="Branch"
                  className="w-full bg-transparent py-2.5 pr-4 bp-mono text-[12.5px] text-[var(--bp-ink)] outline-none placeholder:text-[color-mix(in_oklab,var(--bp-ink-dim)_55%,transparent)]"
                  disabled={loading}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 border border-[color-mix(in_oklab,var(--bp-critical)_45%,transparent)] bg-[color-mix(in_oklab,var(--bp-critical)_10%,transparent)] px-4 py-2.5 bp-mono text-[12px] text-[var(--bp-critical)]"
                >
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {error}
                </div>
              )}

              {/* Examples */}
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_REPOS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setGithubUrl(r)}
                    className="border border-[var(--bp-line-faint)] px-2 py-1 bp-mono text-[11px] text-[var(--bp-ink-dim)] transition-colors hover:border-[var(--bp-line)] hover:text-[var(--bp-ink)]"
                  >
                    {r.replace('https://github.com/', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode selector */}
            <fieldset className="mt-7 w-full">
              <legend className="bp-label mb-3">SCAN MODE</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {SCAN_MODES.map(({ id, icon: Icon, label, description, accent, code }) => {
                  const on = mode === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      aria-pressed={on}
                      className={`group relative border p-4 text-left transition-colors duration-200 ${
                        on
                          ? 'border-[var(--bp-line)] bg-[color-mix(in_oklab,var(--bp-line)_8%,transparent)]'
                          : 'border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_40%,transparent)] hover:border-[var(--bp-line-soft)]'
                      }`}
                    >
                      {on && <span className="bp-reg" style={{ top: -1, left: -1 }} />}
                      {on && <span className="bp-reg br" style={{ bottom: -1, right: -1 }} />}
                      <div className="mb-3 flex items-center justify-between">
                        <span
                          className="grid h-8 w-8 place-items-center border"
                          style={{ borderColor: on ? accent : 'var(--bp-line-faint)' }}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color: on ? accent : 'var(--bp-ink-dim)' }} />
                        </span>
                        <span className="bp-mono text-[10px]" style={{ color: on ? accent : 'var(--bp-ink-dim)' }}>
                          {code}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-[var(--bp-ink)]">{label}</p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--bp-ink-dim)]">{description}</p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Submit */}
            <button
              onClick={() => handleScan()}
              disabled={loading || !githubUrl.trim()}
              className="mt-7 flex w-full items-center justify-center gap-2 border border-[var(--bp-line)] bg-[color-mix(in_oklab,var(--bp-line)_14%,transparent)] px-6 py-3.5 bp-mono text-[13px] tracking-wide text-[var(--bp-ink)] transition-colors duration-200 hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[color-mix(in_oklab,var(--bp-line)_14%,transparent)] disabled:hover:text-[var(--bp-ink)]"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--bp-line-faint)] border-t-[var(--bp-line)]" />
                  RUNNING SCAN…
                </>
              ) : (
                <>
                  <Radar className="h-4 w-4" strokeWidth={1.5} />
                  RUN SCAN
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </>
              )}
            </button>

            <p className="mt-4 flex items-start justify-center gap-1.5 text-center bp-mono text-[10.5px] leading-relaxed text-[var(--bp-ink-dim)]">
              <Lock className="mt-px h-3 w-3 shrink-0" strokeWidth={1.5} />
              Source code is never stored. Only masked results and metadata persist.
            </p>
          </div>

          {/* Recent scans rail */}
          <aside className="hidden w-[288px] shrink-0 flex-col border-l border-[var(--bp-line-faint)] p-5 lg:flex">
            <p className="bp-label mb-4 flex items-center gap-2">
              <Clock className="h-3 w-3" strokeWidth={1.5} />
              Recent scans
            </p>
            <div className="flex flex-col gap-2">
              {visibleRecent.length === 0 ? (
                <p className="bp-mono text-[11px] leading-relaxed text-[var(--bp-ink-dim)]">
                  {authenticated
                    ? 'No scans yet. Run one to build your history.'
                    : 'Sign in to keep a history of your scans.'}
                </p>
              ) : (
                visibleRecent.map((scan) => (
                  <button
                    key={scan.id}
                    onClick={() => (scan.reportId ? router.push(`/report/${scan.reportId}`) : setGithubUrl(scan.url))}
                    className="group border border-[var(--bp-line-faint)] p-3 text-left transition-colors hover:border-[var(--bp-line-soft)]"
                  >
                    <p className="truncate bp-mono text-[12.5px] text-[var(--bp-ink)] transition-colors group-hover:text-[var(--bp-line)]">
                      {scan.name}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 bp-mono text-[10.5px] text-[var(--bp-ink-dim)]">
                      <span>{scan.mode}</span>
                      <span className="text-[color-mix(in_oklab,var(--bp-ink-dim)_65%,transparent)]">{scan.time}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-6 border-t border-[var(--bp-line-faint)] pt-5">
              <p className="bp-label mb-3">What we detect</p>
              <ul className="flex flex-col gap-2.5">
                {DETECTS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5 text-[12px] text-[var(--bp-ink-dim)]">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--bp-line)]" strokeWidth={1.5} />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
