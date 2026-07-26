'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useReportData } from '@/lib/use-report';
import type { Report } from '@/lib/types';
import { ArrowRight } from 'lucide-react';

// Report resolved via useReportData (inline ?data= for fresh scans, or fetched by id).

export default function RoutesPage() {
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

  const apiRoutes = report.nodes.filter((n) => n.type === 'api_route');
  const clientPages = report.nodes.filter((n) => n.type === 'client_page');
  const edges = report.edges;

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

  const brokenLinks = report.findings.filter((f) => f.category === 'broken_api_link');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* API routes */}
        <div>
          <p className="bp-label mb-3">API routes ({apiRoutes.length})</p>
          <div className="space-y-2">
            {apiRoutes.length > 0 ? (
              apiRoutes.map((route) => {
                const callers = routeCallers[route.id] ?? [];
                const finding = report.findings.find((f) => f.relatedNodeIds.includes(route.id));
                return (
                  <div
                    key={route.id}
                    className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] p-4 transition-colors hover:border-[var(--bp-line-soft)]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="bp-mono text-[13px] text-[var(--bp-line)]">{route.label}</span>
                      {finding && (
                        <span
                          className="border px-2 py-0.5 bp-mono text-[10px] uppercase"
                          style={{ color: 'var(--bp-critical)', borderColor: 'color-mix(in oklab, var(--bp-critical) 40%, transparent)' }}
                        >
                          {finding.severity}
                        </span>
                      )}
                    </div>
                    {route.filePath && (
                      <p className="mb-2 bp-mono text-[11px] text-[var(--bp-ink-dim)]">{route.filePath}</p>
                    )}
                    {callers.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bp-mono text-[10px] text-[var(--bp-ink-dim)]">Called by:</span>
                        {callers.map((c) => (
                          <span key={c} className="border border-[var(--bp-line-faint)] px-1.5 py-0.5 bp-mono text-[10px] text-[var(--bp-ink-dim)]">
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="bp-mono text-[11px] text-[color-mix(in_oklab,var(--bp-ink-dim)_70%,transparent)]">
                        No detected callers
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <EmptyCard>No API routes detected</EmptyCard>
            )}
          </div>
        </div>

        {/* Client pages */}
        <div>
          <p className="bp-label mb-3">Client pages ({clientPages.length})</p>
          <div className="space-y-2">
            {clientPages.length > 0 ? (
              clientPages.map((page) => {
                const outgoing = edges.filter((e) => e.from === page.id);
                return (
                  <div
                    key={page.id}
                    className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] p-4 transition-colors hover:border-[var(--bp-line-soft)]"
                  >
                    <div className="mb-1 bp-mono text-[13px]" style={{ color: '#b9a8ff' }}>
                      {page.label}
                    </div>
                    {page.filePath && (
                      <p className="mb-2 bp-mono text-[11px] text-[var(--bp-ink-dim)]">{page.filePath}</p>
                    )}
                    {outgoing.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        {outgoing.map((e, i) => (
                          <div key={i} className="flex items-center gap-1.5 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
                            <ArrowRight className="h-3 w-3 text-[var(--bp-line)]" strokeWidth={1.5} />
                            <span>{e.to.replace('route:', '')}</span>
                            <span className="text-[color-mix(in_oklab,var(--bp-ink-dim)_65%,transparent)]">({e.label})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <EmptyCard>No client pages detected</EmptyCard>
            )}
          </div>
        </div>
      </div>

      {brokenLinks.length > 0 && (
        <div>
          <p className="bp-label mb-3" style={{ color: 'var(--bp-critical)' }}>
            Broken API links
          </p>
          <div className="space-y-2">
            {brokenLinks.map((f) => (
              <div
                key={f.id}
                className="flex items-start gap-3 border p-4"
                style={{ borderColor: 'color-mix(in oklab, var(--bp-critical) 30%, transparent)', background: 'color-mix(in oklab, var(--bp-critical) 5%, transparent)' }}
              >
                <span className="mt-1.5 h-2 w-2 shrink-0" style={{ background: 'var(--bp-critical)' }} />
                <div>
                  <p className="text-[13px] font-medium text-[var(--bp-ink)]">{f.evidence}</p>
                  <p className="mt-0.5 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
                    Called from {f.filePath} line {f.lineNumber}
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

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[var(--bp-line-faint)] p-6 text-center bp-mono text-[13px] text-[var(--bp-ink-dim)]">
      {children}
    </div>
  );
}
