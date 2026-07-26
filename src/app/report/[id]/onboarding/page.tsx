'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useReportData } from '@/lib/use-report';
import type { Report } from '@/lib/types';
import { BookOpen, Code, Shield, GitBranch, Layers, ArrowRight } from 'lucide-react';

// Report resolved via useReportData (inline ?data= for fresh scans, or fetched by id).

export default function OnboardingPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const report: Report | null = useReportData(params.id, searchParams.get('data')).report;

  if (!report) {
    return (
      <div className="flex items-center justify-center py-24 bp-mono text-[13px] text-[var(--bp-ink-dim)]">
        No report data. Run a scan first.
      </div>
    );
  }

  const apiCount = report.nodes.filter((n) => n.type === 'api_route').length;
  const pageCount = report.nodes.filter((n) => n.type === 'client_page').length;
  const envCount = report.nodes.filter((n) => n.type === 'env_var').length;
  const criticalCount = report.findings.filter((f) => f.severity === 'critical').length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="relative border border-[var(--bp-line-soft)] bg-[color-mix(in_oklab,var(--bp-ground-2)_50%,transparent)] p-6">
        <span className="bp-reg" style={{ top: -1, left: -1 }} />
        <span className="bp-reg tr" style={{ top: -1, right: -1 }} />
        <span className="bp-reg bl" style={{ bottom: -1, left: -1 }} />
        <span className="bp-reg br" style={{ bottom: -1, right: -1 }} />
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-[var(--bp-line)]">
            <BookOpen className="h-5 w-5 text-[var(--bp-line)]" strokeWidth={1.5} />
          </span>
          <div>
            <p className="bp-label mb-1">Generated onboarding</p>
            <h2 className="bp-mono text-[16px] font-medium text-[var(--bp-ink)]">
              {report.repo.owner}/{report.repo.name}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--bp-ink-dim)]">
              {report.repo.description || 'A repository analyzed by RepoRadar.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.stack.map((s) => (
                <span key={s} className="border border-[var(--bp-line-faint)] px-2 py-0.5 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'API routes', value: apiCount, color: 'var(--bp-line)', icon: Code },
          { label: 'Client pages', value: pageCount, color: '#b9a8ff', icon: Layers },
          { label: 'Env variables', value: envCount, color: 'var(--bp-alert)', icon: Shield },
          { label: 'Critical issues', value: criticalCount, color: 'var(--bp-critical)', icon: Shield },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] p-4 text-center">
            <Icon className="mx-auto mb-2 h-4 w-4" style={{ color }} strokeWidth={1.5} />
            <p className="bp-mono text-[20px]" style={{ color }}>{value}</p>
            <p className="mt-0.5 bp-label">{label}</p>
          </div>
        ))}
      </div>

      {/* Getting started */}
      <Panel icon={GitBranch} title="Getting started">
        <div className="space-y-3">
          {[
            { step: '1', title: 'Clone the repository', code: `git clone ${report.repo.url}` },
            { step: '2', title: 'Install dependencies', code: 'npm install' },
            { step: '3', title: 'Set up environment variables', code: 'cp .env.example .env.local' },
            { step: '4', title: 'Start development server', code: 'npm run dev' },
          ].map(({ step, title, code }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center border border-[var(--bp-line-faint)] bp-mono text-[10px] text-[var(--bp-line)]">
                {step}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--bp-ink)]">{title}</p>
                <code className="mt-1 block overflow-x-auto border border-[var(--bp-line-faint)] bg-[var(--bp-ground)] px-3 py-1.5 bp-mono text-[12px] text-[var(--bp-line)]">
                  {code}
                </code>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Architecture */}
      <Panel icon={Layers} title="Architecture overview">
        <div className="space-y-3">
          {[
            { title: 'Client Layer', desc: `${pageCount} detected client pages and components. These are bundled and served to the browser.`, color: '#b9a8ff' },
            { title: 'Application Layer', desc: `${apiCount} API routes handle server-side logic, auth, and data processing.`, color: 'var(--bp-line)' },
            { title: 'Data / Config Layer', desc: `${envCount} environment variables configure the application. Secrets are server-only.`, color: 'var(--bp-alert)' },
          ].map(({ title, desc, color }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0" style={{ background: color }} />
              <div>
                <p className="text-[13px] font-semibold" style={{ color }}>{title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--bp-ink-dim)]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Security checklist */}
      {report.findings.length > 0 && (
        <Panel icon={Shield} title="Security checklist for new contributors">
          <div className="space-y-2">
            {report.findings.slice(0, 5).map((finding) => (
              <div key={finding.id} className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--bp-line)]" strokeWidth={1.5} />
                <div>
                  <p className="text-[12px] font-medium text-[var(--bp-ink)]">{finding.title}</p>
                  <p className="text-[11px] text-[var(--bp-ink-dim)]">{finding.suggestedFix}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Markdown */}
      <details className="group border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] p-5">
        <summary className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-semibold text-[var(--bp-ink)]">
          <Code className="h-4 w-4 text-[var(--bp-line)]" strokeWidth={1.5} />
          Full markdown report
          <span className="ml-auto bp-mono text-[11px] text-[var(--bp-ink-dim)] group-open:hidden">Show</span>
          <span className="ml-auto hidden bp-mono text-[11px] text-[var(--bp-ink-dim)] group-open:block">Hide</span>
        </summary>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap border border-[var(--bp-line-faint)] bg-[var(--bp-ground)] p-4 bp-mono text-[11px] leading-relaxed text-[var(--bp-ink-dim)]">
          {report.markdown}
        </pre>
      </details>
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: typeof Shield; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[var(--bp-ink)]">
        <Icon className="h-4 w-4 text-[var(--bp-line)]" strokeWidth={1.5} />
        {title}
      </h3>
      {children}
    </div>
  );
}
