'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useReportData } from '@/lib/use-report';
import type { Report } from '@/lib/types';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

// Report resolved via useReportData (inline ?data= for fresh scans, or fetched by id).

export default function EnvironmentPage() {
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

  const envNodes = report.nodes.filter((n) => n.type === 'env_var');
  const missingDocFindings = report.findings.filter((f) => f.category === 'missing_env_documentation');
  const frontendExposureFindings = report.findings.filter((f) => f.category === 'frontend_secret_exposure');

  const missingDocNames = new Set(missingDocFindings.map((f) => f.evidence));
  const frontendExposedNames = new Set(
    frontendExposureFindings.map((f) => {
      const envId = f.relatedNodeIds.find((id) => id.startsWith('env:'));
      return envId?.replace('env:', '') ?? '';
    }),
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] p-4">
          <p className="bp-label mb-1">Total variables</p>
          <p className="bp-mono text-[24px] text-[var(--bp-ink)]">{envNodes.length}</p>
        </div>
        <div className="border p-4" style={{ borderColor: 'color-mix(in oklab, var(--bp-critical) 30%, transparent)', background: 'color-mix(in oklab, var(--bp-critical) 5%, transparent)' }}>
          <p className="mb-1 bp-label" style={{ color: 'var(--bp-critical)' }}>Frontend exposed</p>
          <p className="bp-mono text-[24px]" style={{ color: 'var(--bp-critical)' }}>{frontendExposureFindings.length}</p>
        </div>
        <div className="border p-4" style={{ borderColor: 'color-mix(in oklab, var(--bp-alert) 30%, transparent)', background: 'color-mix(in oklab, var(--bp-alert) 5%, transparent)' }}>
          <p className="mb-1 bp-label" style={{ color: 'var(--bp-alert)' }}>Missing docs</p>
          <p className="bp-mono text-[24px]" style={{ color: 'var(--bp-alert)' }}>{missingDocFindings.length}</p>
        </div>
      </div>

      {/* Table */}
      <div>
        <p className="bp-label mb-3">Environment variables ({envNodes.length})</p>
        <div className="overflow-x-auto border border-[var(--bp-line-faint)]">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[2fr_1fr_1.2fr_1fr] gap-4 border-b border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] px-4 py-2.5">
              {['Variable', 'Layer', 'Documented', 'Risk'].map((h) => (
                <span key={h} className="bp-label">{h}</span>
              ))}
            </div>
            {envNodes.length === 0 ? (
              <div className="bg-[var(--bp-ground-2)] px-4 py-8 text-center bp-mono text-[13px] text-[var(--bp-ink-dim)]">
                No environment variables detected
              </div>
            ) : (
              envNodes.map((node) => {
                const name = node.label;
                const isPublic = node.layer === 'client';
                const isMissingDoc = missingDocNames.has(name);
                const isFrontendExposed = frontendExposedNames.has(name);

                return (
                  <div
                    key={node.id}
                    className="grid grid-cols-[2fr_1fr_1.2fr_1fr] items-center gap-4 border-b border-[var(--bp-line-faint)] px-4 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--bp-line)_5%,transparent)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bp-mono text-[12px]" style={{ color: isPublic ? '#b9a8ff' : 'var(--bp-ink)' }}>
                        {name}
                      </span>
                      {isPublic && (
                        <span className="border px-1.5 py-px bp-mono text-[9px]" style={{ color: '#b9a8ff', borderColor: 'color-mix(in oklab, #b9a8ff 40%, transparent)' }}>
                          PUBLIC
                        </span>
                      )}
                    </div>
                    <span className="bp-mono text-[12px] capitalize" style={{ color: isPublic ? '#b9a8ff' : 'var(--bp-ink-dim)' }}>
                      {node.layer}
                    </span>
                    <div>
                      {isMissingDoc ? (
                        <span className="flex items-center gap-1 bp-mono text-[11px]" style={{ color: 'var(--bp-alert)' }}>
                          <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                          Missing
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bp-mono text-[11px] text-[var(--bp-line)]">
                          <CheckCircle className="h-3 w-3" strokeWidth={1.5} />
                          Documented
                        </span>
                      )}
                    </div>
                    <div>
                      {isFrontendExposed ? (
                        <SeverityBadge severity="high" />
                      ) : isMissingDoc ? (
                        <SeverityBadge severity="low" />
                      ) : (
                        <span className="flex items-center gap-1 bp-mono text-[11px] text-[color-mix(in_oklab,var(--bp-ink-dim)_70%,transparent)]">
                          <Info className="h-3 w-3" strokeWidth={1.5} />
                          None
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {frontendExposureFindings.length > 0 && (
        <div className="border p-4" style={{ borderColor: 'color-mix(in oklab, var(--bp-critical) 30%, transparent)', background: 'color-mix(in oklab, var(--bp-critical) 5%, transparent)' }}>
          <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--bp-critical)' }}>
            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
            Frontend secret exposure warning
          </p>
          <p className="mb-3 text-[13px] text-[var(--bp-ink-dim)]">
            The following variables have secret-like names but are accessible in client-side code:
          </p>
          {frontendExposureFindings.map((f) => (
            <div key={f.id} className="mb-2 last:mb-0">
              <p className="text-[13px] font-medium text-[var(--bp-ink)]">{f.title}</p>
              <p className="mt-0.5 text-[12px] text-[var(--bp-ink-dim)]">{f.suggestedFix}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
