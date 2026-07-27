'use client';

import { useParams } from 'next/navigation';

import { SeverityBadge } from '@/components/ui/SeverityBadge';
import type { Report, Severity } from '@/lib/types';
import { ArrowRight, AlertTriangle, Info, Cpu, Database, Lock, Loader2 } from 'lucide-react';
import { useReportData } from '@/lib/use-report';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="bp-label mb-3">{children}</p>;
}

function SeverityStrip({ report }: { report: Report }) {
  const counts = SEVERITY_ORDER.reduce(
    (acc, s) => {
      acc[s] = report.findings.filter((f) => f.severity === s).length;
      return acc;
    },
    {} as Record<Severity, number>,
  );

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {SEVERITY_ORDER.map((severity) => (
        <div
          key={severity}
          className="flex items-center justify-between border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] px-4 py-3"
        >
          <SeverityBadge severity={severity} showDot />
          <span className="bp-mono text-[20px] text-[var(--bp-ink)]">{counts[severity]}</span>
        </div>
      ))}
    </div>
  );
}

function RiskPathCard({ path }: { path: Report['riskPaths'][0] }) {
  return (
    <div className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] p-4 transition-colors hover:border-[var(--bp-line-soft)]">
      <div className="mb-3 flex items-start gap-3">
        <SeverityBadge severity={path.severity} />
        <h3 className="text-[13px] font-medium leading-snug text-[var(--bp-ink)]">{path.title}</h3>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {path.path.map((step, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="border border-[var(--bp-line-faint)] px-2 py-0.5 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
              {step}
            </span>
            {i < path.path.length - 1 && <ArrowRight className="h-3 w-3 text-[var(--bp-line)]" strokeWidth={1.5} />}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-[var(--bp-ink-dim)]">{path.assessment}</p>
    </div>
  );
}

function CoverageCard({ report }: { report: Report }) {
  return (
    <div className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] p-5">
      <SectionLabel>Scan coverage</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Files found', value: report.coverage.filesFound, icon: Info },
          { label: 'Files analyzed', value: report.coverage.filesAnalyzed, icon: Cpu },
          { label: 'Secrets masked', value: report.coverage.maskedSecrets, icon: Lock },
          { label: 'Scanners run', value: report.coverage.scannersCompleted, icon: Database },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-[var(--bp-line-faint)] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Icon className="h-3 w-3 text-[var(--bp-line)]" strokeWidth={1.5} />
              <span className="bp-mono text-[10px] text-[var(--bp-ink-dim)]">{label}</span>
            </div>
            <span className="bp-mono text-[20px] text-[var(--bp-ink)]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackBadges({ stack }: { stack: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {stack.map((tech) => (
        <span
          key={tech}
          className="border border-[var(--bp-line-faint)] px-3 py-1 bp-mono text-[12px] text-[var(--bp-ink-dim)]"
        >
          {tech}
        </span>
      ))}
    </div>
  );
}

export default function ReportOverviewPage() {
  const params = useParams<{ id: string }>();
  const { report, loading } = useReportData(params.id);

  if (loading) return <ReportLoading />;
  if (!report) return <NoReport />;

  const topFindings = report.findings.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Detected stack</SectionLabel>
        <StackBadges stack={report.stack} />
      </div>

      <div>
        <SectionLabel>Finding summary</SectionLabel>
        <SeverityStrip report={report} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionLabel>Priority risk paths</SectionLabel>
          <div className="space-y-3">
            {report.riskPaths.length > 0 ? (
              report.riskPaths.map((path) => <RiskPathCard key={path.id} path={path} />)
            ) : (
              <div className="border border-[var(--bp-line-faint)] p-6 text-center bp-mono text-[13px] text-[var(--bp-ink-dim)]">
                No risk paths detected.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <CoverageCard report={report} />
          <div className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] p-5">
            <SectionLabel>Start here</SectionLabel>
            <p className="mb-4 text-[12px] leading-relaxed text-[var(--bp-ink-dim)]">
              Scan detected {report.findings.length} findings. Review critical items first.
            </p>
            <ul className="space-y-2.5">
              {topFindings.map((finding) => (
                <li key={finding.id} className="flex items-start gap-2">
                  <SeverityBadge severity={finding.severity} showDot={false} />
                  <span className="text-[12px] leading-snug text-[var(--bp-ink-dim)]">{finding.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div
        className="border p-4 text-[12px] leading-relaxed text-[var(--bp-ink-dim)]"
        style={{ borderColor: 'color-mix(in oklab, var(--bp-alert) 25%, transparent)', background: 'color-mix(in oklab, var(--bp-alert) 5%, transparent)' }}
      >
        <strong style={{ color: 'var(--bp-alert)' }}>Static analysis disclaimer:</strong>{' '}
        RepoRadar provides static analysis and AI-assisted explanations. Findings may include false positives and should
        be reviewed by a developer.
      </div>
    </div>
  );
}

export function ReportLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Loader2 className="mb-4 h-7 w-7 animate-spin text-[var(--bp-line)]" strokeWidth={1.5} />
      <p className="bp-mono text-[12px] text-[var(--bp-ink-dim)]">Loading report…</p>
    </div>
  );
}

export function NoReport() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertTriangle className="mb-4 h-9 w-9 text-[var(--bp-alert)]" strokeWidth={1.5} />
      <p className="text-[15px] font-medium text-[var(--bp-ink)]">No report data found</p>
      <p className="mt-1 bp-mono text-[12px] text-[var(--bp-ink-dim)]">
        Run a new scan from the dashboard to generate a report.
      </p>
    </div>
  );
}
