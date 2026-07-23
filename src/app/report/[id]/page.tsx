'use client';

import { useSearchParams } from 'next/navigation';

import { SeverityBadge } from '@/components/ui/SeverityBadge';
import type { Report, Severity } from '@/lib/types';
import { ArrowRight, AlertTriangle, Info, Cpu, Database, Lock } from 'lucide-react';

function getReport(dataParam: string | null): Report | null {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(dataParam)) as Report;
  } catch {
    return null;
  }
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function SeverityStrip({ report }: { report: Report }) {
  const counts = SEVERITY_ORDER.reduce(
    (acc, s) => {
      acc[s] = report.findings.filter((f) => f.severity === s).length;
      return acc;
    },
    {} as Record<Severity, number>
  );

  return (
    <div className="flex gap-3 flex-wrap">
      {SEVERITY_ORDER.map((severity) => (
        <div
          key={severity}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#181D20] border border-[#364047]"
        >
          <SeverityBadge severity={severity} showDot />
          <span className="text-[20px] font-bold text-[#F2F4F0] font-mono">{counts[severity]}</span>
        </div>
      ))}
    </div>
  );
}

function RiskPathCard({ path }: { path: Report['riskPaths'][0] }) {
  return (
    <div className="p-4 rounded-xl bg-[#181D20] border border-[#364047] hover:border-[#364047] transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <SeverityBadge severity={path.severity} />
        <h3 className="text-[13px] font-medium text-[#F2F4F0] leading-snug">{path.title}</h3>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {path.path.map((step, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#22292D] text-[#A9B3B8] border border-[#364047]">
              {step}
            </span>
            {i < path.path.length - 1 && <ArrowRight className="w-3 h-3 text-[#364047]" />}
          </span>
        ))}
      </div>
      <p className="text-[12px] text-[#A9B3B8] mt-3 leading-relaxed">{path.assessment}</p>
    </div>
  );
}

function CoverageCard({ report }: { report: Report }) {
  return (
    <div className="p-5 rounded-xl bg-[#181D20] border border-[#364047]">
      <h3 className="text-[13px] font-semibold text-[#F2F4F0] mb-4">Scan Coverage</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Files Found', value: report.coverage.filesFound, icon: Info },
          { label: 'Files Analyzed', value: report.coverage.filesAnalyzed, icon: Cpu },
          { label: 'Secrets Masked', value: report.coverage.maskedSecrets, icon: Lock },
          { label: 'Scanners Run', value: report.coverage.scannersCompleted, icon: Database },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-3 rounded-lg bg-[#22292D]">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3 h-3 text-[#A9B3B8]" />
              <span className="text-[11px] text-[#A9B3B8]">{label}</span>
            </div>
            <span className="text-[20px] font-bold text-[#F2F4F0] font-mono">{value}</span>
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
          className="px-3 py-1 rounded-full text-[12px] font-mono bg-[#22292D] text-[#A9B3B8] border border-[#364047]"
        >
          {tech}
        </span>
      ))}
    </div>
  );
}

export default function ReportOverviewPage() {
  const searchParams = useSearchParams();
  const report = getReport(searchParams.get('data'));

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A9B3B8]">
        <AlertTriangle className="w-10 h-10 mb-4 text-[#F1BC62]" />
        <p className="text-[15px] font-medium text-[#F2F4F0]">No report data found</p>
        <p className="text-[13px] mt-1">Run a new scan from the dashboard to generate a report.</p>
      </div>
    );
  }

  const topFindings = report.findings.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stack */}
      <div>
        <p className="text-[11px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-3">Detected Stack</p>
        <StackBadges stack={report.stack} />
      </div>

      {/* Severity Strip */}
      <div>
        <p className="text-[11px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-3">Finding Summary</p>
        <SeverityStrip report={report} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Paths - wide */}
        <div className="lg:col-span-2">
          <p className="text-[11px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-3">Priority Risk Paths</p>
          <div className="space-y-3">
            {report.riskPaths.length > 0 ? (
              report.riskPaths.map((path) => (
                <RiskPathCard key={path.id} path={path} />
              ))
            ) : (
              <div className="p-6 rounded-xl bg-[#181D20] border border-[#364047] text-center text-[#A9B3B8] text-[13px]">
                No risk paths detected. Great job! 🎉
              </div>
            )}
          </div>
        </div>

        {/* Coverage + Start Here - narrow */}
        <div className="space-y-4">
          <CoverageCard report={report} />
          <div className="p-5 rounded-xl bg-[#181D20] border border-[#364047]">
            <h3 className="text-[13px] font-semibold text-[#F2F4F0] mb-1">Start Here</h3>
            <p className="text-[12px] text-[#A9B3B8] mb-4 leading-relaxed">
              Scan detected {report.findings.length} findings. Review critical items first.
            </p>
            <ul className="space-y-2">
              {topFindings.map((finding) => (
                <li key={finding.id} className="flex items-start gap-2">
                  <SeverityBadge severity={finding.severity} showDot={false} />
                  <span className="text-[12px] text-[#A9B3B8] leading-snug">{finding.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-xl bg-[#F1BC62]/5 border border-[#F1BC62]/20 text-[12px] text-[#A9B3B8]">
        <strong className="text-[#F1BC62]">Static Analysis Disclaimer:</strong>{' '}
        RepoRadar provides static analysis and AI-assisted explanations. Findings may include false positives and should
        be reviewed by a developer.
      </div>
    </div>
  );
}
