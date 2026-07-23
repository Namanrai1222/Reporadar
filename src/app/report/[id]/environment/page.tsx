'use client';

import { useSearchParams } from 'next/navigation';
import type { Report } from '@/lib/types';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

function getReport(dataParam: string | null): Report | null {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(dataParam)) as Report;
  } catch {
    return null;
  }
}

export default function EnvironmentPage() {
  const searchParams = useSearchParams();
  const report = getReport(searchParams.get('data'));

  if (!report) {
    return (
      <div className="flex items-center justify-center py-24 text-[#A9B3B8] text-[13px]">
        No report data. Run a scan first.
      </div>
    );
  }

  const envNodes = report.nodes.filter((n) => n.type === 'env_var');
  const missingDocFindings = report.findings.filter((f) => f.category === 'missing_env_documentation');
  const frontendExposureFindings = report.findings.filter((f) => f.category === 'frontend_secret_exposure');

  const missingDocNames = new Set(missingDocFindings.map((f) => f.evidence));
  const frontendExposedNames = new Set(frontendExposureFindings.map((f) => {
    // extract var name from relatedNodeIds
    const envId = f.relatedNodeIds.find((id) => id.startsWith('env:'));
    return envId?.replace('env:', '') ?? '';
  }));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#181D20] border border-[#364047]">
          <p className="text-[11px] text-[#A9B3B8] mb-1">Total Variables</p>
          <p className="text-[24px] font-bold font-mono text-[#F2F4F0]">{envNodes.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#F07167]/5 border border-[#F07167]/30">
          <p className="text-[11px] text-[#F07167] mb-1">Frontend Exposed</p>
          <p className="text-[24px] font-bold font-mono text-[#F07167]">{frontendExposureFindings.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#F1BC62]/5 border border-[#F1BC62]/30">
          <p className="text-[11px] text-[#F1BC62] mb-1">Missing Docs</p>
          <p className="text-[24px] font-bold font-mono text-[#F1BC62]">{missingDocFindings.length}</p>
        </div>
      </div>

      {/* Env Var Table */}
      <div>
        <p className="text-[11px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-3">
          Environment Variables ({envNodes.length})
        </p>
        <div className="rounded-xl border border-[#364047] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#364047] grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 bg-[#181D20]">
            <span className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest">Variable</span>
            <span className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest">Layer</span>
            <span className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest">Documented</span>
            <span className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest">Risk</span>
          </div>
          {envNodes.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#A9B3B8] text-[13px] bg-[#181D20]">
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
                  className="px-4 py-3 border-b border-[#364047]/50 grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 items-center bg-[#181D20] hover:bg-[#22292D] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[12px] font-medium ${
                        isPublic ? 'text-[#B9A8FF]' : 'text-[#F2F4F0]'
                      }`}
                    >
                      {name}
                    </span>
                    {isPublic && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#B9A8FF]/15 text-[#B9A8FF]">
                        PUBLIC
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[12px] capitalize font-mono ${
                      isPublic ? 'text-[#B9A8FF]' : 'text-[#A9B3B8]'
                    }`}
                  >
                    {node.layer}
                  </span>
                  <div>
                    {isMissingDoc ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#F1BC62]">
                        <AlertTriangle className="w-3 h-3" />
                        Missing
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-[#63D7D1]">
                        <CheckCircle className="w-3 h-3" />
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
                      <span className="flex items-center gap-1 text-[11px] text-[#364047]">
                        <Info className="w-3 h-3" />
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

      {/* Frontend Exposure Warnings */}
      {frontendExposureFindings.length > 0 && (
        <div className="p-4 rounded-xl bg-[#F07167]/5 border border-[#F07167]/30">
          <p className="text-[13px] font-semibold text-[#F07167] mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Frontend Secret Exposure Warning
          </p>
          <p className="text-[13px] text-[#A9B3B8] mb-3">
            The following variables have secret-like names but are accessible in client-side code:
          </p>
          {frontendExposureFindings.map((f) => (
            <div key={f.id} className="mb-2 last:mb-0">
              <p className="text-[13px] font-medium text-[#F2F4F0]">{f.title}</p>
              <p className="text-[12px] text-[#A9B3B8] mt-0.5">{f.suggestedFix}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
