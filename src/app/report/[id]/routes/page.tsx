'use client';

import { useSearchParams } from 'next/navigation';
import type { Report } from '@/lib/types';
import { ArrowRight } from 'lucide-react';

function getReport(dataParam: string | null): Report | null {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(dataParam)) as Report;
  } catch {
    return null;
  }
}

export default function RoutesPage() {
  const searchParams = useSearchParams();
  const report = getReport(searchParams.get('data'));

  if (!report) {
    return (
      <div className="flex items-center justify-center py-24 text-[#A9B3B8] text-[13px]">
        No report data. Run a scan first.
      </div>
    );
  }

  const apiRoutes = report.nodes.filter((n) => n.type === 'api_route');
  const clientPages = report.nodes.filter((n) => n.type === 'client_page');
  const edges = report.edges;

  // Build a map of route -> calling pages
  const routeCallers: Record<string, string[]> = {};
  for (const edge of edges) {
    if (edge.type === 'calls') {
      const callerNode = report.nodes.find((n) => n.id === edge.from);
      if (callerNode) {
        if (!routeCallers[edge.to]) routeCallers[edge.to] = [];
        routeCallers[edge.to].push(callerNode.label);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Routes */}
        <div>
          <p className="text-[11px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-3">
            API Routes ({apiRoutes.length})
          </p>
          <div className="space-y-2">
            {apiRoutes.length > 0 ? (
              apiRoutes.map((route) => {
                const callers = routeCallers[route.id] ?? [];
                const finding = report.findings.find((f) => f.relatedNodeIds.includes(route.id));
                return (
                  <div
                    key={route.id}
                    className="p-4 rounded-xl bg-[#181D20] border border-[#364047] hover:border-[#63D7D1]/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-mono text-[13px] text-[#63D7D1] font-medium">{route.label}</div>
                      {finding && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F07167]/15 text-[#F07167]">
                          {finding.severity}
                        </span>
                      )}
                    </div>
                    {route.filePath && (
                      <p className="text-[11px] font-mono text-[#364047] mb-2">{route.filePath}</p>
                    )}
                    {callers.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[#A9B3B8]">Called by:</span>
                        {callers.map((c) => (
                          <span
                            key={c}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#22292D] text-[#A9B3B8]"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    {callers.length === 0 && (
                      <p className="text-[11px] text-[#364047]">No detected callers</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 rounded-xl bg-[#181D20] border border-[#364047] text-center text-[#A9B3B8] text-[13px]">
                No API routes detected
              </div>
            )}
          </div>
        </div>

        {/* Client Pages */}
        <div>
          <p className="text-[11px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-3">
            Client Pages ({clientPages.length})
          </p>
          <div className="space-y-2">
            {clientPages.length > 0 ? (
              clientPages.map((page) => {
                const outgoing = edges.filter((e) => e.from === page.id);
                return (
                  <div
                    key={page.id}
                    className="p-4 rounded-xl bg-[#181D20] border border-[#364047] hover:border-[#B9A8FF]/40 transition-all"
                  >
                    <div className="font-mono text-[13px] text-[#B9A8FF] font-medium mb-1">{page.label}</div>
                    {page.filePath && (
                      <p className="text-[11px] font-mono text-[#364047] mb-2">{page.filePath}</p>
                    )}
                    {outgoing.length > 0 && (
                      <div className="flex flex-col gap-1 mt-2">
                        {outgoing.map((e, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#A9B3B8]">
                            <ArrowRight className="w-3 h-3 text-[#364047]" />
                            <span className="font-mono">{e.to.replace('route:', '')}</span>
                            <span className="text-[#364047]">({e.label})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 rounded-xl bg-[#181D20] border border-[#364047] text-center text-[#A9B3B8] text-[13px]">
                No client pages detected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Broken API links */}
      {report.findings.filter((f) => f.category === 'broken_api_link').length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-[#F07167] uppercase tracking-widest mb-3">
            Broken API Links
          </p>
          <div className="space-y-2">
            {report.findings
              .filter((f) => f.category === 'broken_api_link')
              .map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl bg-[#F07167]/5 border border-[#F07167]/30 flex items-start gap-3"
                >
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[#F07167] shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-[#F2F4F0]">{f.evidence}</p>
                    <p className="text-[11px] text-[#A9B3B8] mt-0.5">
                      Called from <span className="font-mono">{f.filePath}</span> line {f.lineNumber}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
