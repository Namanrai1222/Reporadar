'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useReportData } from '@/lib/use-report';
import { useState } from 'react';
import type { Finding, Report, Severity } from '@/lib/types';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { ChevronDown, ChevronUp, X, FileCode, AlertTriangle, CheckCircle, Eye } from 'lucide-react';

// Report resolved via useReportData (inline ?data= for fresh scans, or fetched by id).

const SEVERITY_FILTERS: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const CATEGORY_LABELS: Record<Finding['category'], string> = {
  secret_leak: 'Secret Leak',
  frontend_secret_exposure: 'Frontend Secret',
  missing_env_documentation: 'Missing Env Docs',
  broken_api_link: 'Broken API Link',
  auth: 'Auth Issue',
  validation: 'Input Validation',
  sql_injection: 'SQL Injection',
  cors: 'CORS Config',
  debug_config: 'Debug Config',
  dependency: 'Dependency',
  prompt_injection: 'Prompt Injection',
};

export default function FindingsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const report: Report | null = useReportData(params.id, searchParams.get('data')).report;

  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set());
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [sortField, setSortField] = useState<'severity' | 'file'>('severity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!report) {
    return (
      <div className="flex items-center justify-center py-24 bp-mono text-[13px] text-[var(--bp-ink-dim)]">
        No report data. Run a scan first.
      </div>
    );
  }

  function toggleSeverity(s: Severity) {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function handleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const severityWeight: Record<Severity, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

  const filtered = report.findings
    .filter((f) => severityFilter.size === 0 || severityFilter.has(f.severity))
    .sort((a, b) => {
      if (sortField === 'severity') {
        const diff = severityWeight[b.severity] - severityWeight[a.severity];
        return sortDir === 'desc' ? diff : -diff;
      }
      const diff = a.filePath.localeCompare(b.filePath);
      return sortDir === 'desc' ? -diff : diff;
    });

  const sortIcon = (field: typeof sortField) =>
    sortField === field ? (
      sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
    ) : null;

  return (
    <div className="-mx-5 flex h-[calc(100vh-190px)] overflow-hidden md:-mx-6">
      {/* Table */}
      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden ${selectedFinding ? 'hidden lg:flex' : 'flex'}`}>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] px-5 py-3 md:px-6">
          <span className="bp-label mr-1">Filter</span>
          {SEVERITY_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSeverity(s)}
              aria-pressed={severityFilter.size === 0 || severityFilter.has(s)}
              className={`transition-opacity ${severityFilter.size === 0 || severityFilter.has(s) ? 'opacity-100' : 'opacity-35 hover:opacity-70'}`}
            >
              <SeverityBadge severity={s} showDot />
            </button>
          ))}
          {severityFilter.size > 0 && (
            <button
              onClick={() => setSeverityFilter(new Set())}
              className="ml-auto bp-mono text-[11px] text-[var(--bp-ink-dim)] transition-colors hover:text-[var(--bp-critical)]"
            >
              Clear
            </button>
          )}
          <span className={`bp-mono text-[11px] text-[var(--bp-ink-dim)] ${severityFilter.size > 0 ? '' : 'ml-auto'}`}>
            {filtered.length} findings
          </span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[76px_1fr_140px] gap-4 border-b border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] px-5 py-2 md:grid-cols-[80px_1fr_160px_90px] md:px-6">
          <button onClick={() => handleSort('severity')} className="flex items-center gap-1 bp-label hover:text-[var(--bp-ink)]">
            Severity {sortIcon('severity')}
          </button>
          <span className="bp-label">Finding</span>
          <button onClick={() => handleSort('file')} className="flex items-center gap-1 bp-label hover:text-[var(--bp-ink)]">
            File {sortIcon('file')}
          </button>
          <span className="hidden bp-label md:block">Category</span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle className="mb-3 h-9 w-9 text-[var(--bp-line)]" strokeWidth={1.5} />
              <p className="text-[15px] font-medium text-[var(--bp-ink)]">No findings match the current filters</p>
            </div>
          ) : (
            filtered.map((finding) => {
              const on = selectedFinding?.id === finding.id;
              return (
                <button
                  key={finding.id}
                  onClick={() => setSelectedFinding(on ? null : finding)}
                  className={`grid w-full grid-cols-[76px_1fr_140px] items-center gap-4 border-b border-[var(--bp-line-faint)] px-5 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--bp-line)_6%,transparent)] md:grid-cols-[80px_1fr_160px_90px] md:px-6 ${
                    on ? 'bg-[color-mix(in_oklab,var(--bp-line)_9%,transparent)]' : ''
                  }`}
                >
                  <SeverityBadge severity={finding.severity} showDot />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[var(--bp-ink)]">{finding.title}</p>
                    <p className="mt-0.5 bp-mono text-[11px] text-[var(--bp-ink-dim)]">Line {finding.lineNumber}</p>
                  </div>
                  <p className="truncate bp-mono text-[11px] text-[var(--bp-ink-dim)]">
                    {finding.filePath.split('/').slice(-2).join('/')}
                  </p>
                  <span className="hidden truncate bp-mono text-[10px] text-[var(--bp-ink-dim)] md:block">
                    {CATEGORY_LABELS[finding.category] ?? finding.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selectedFinding && (
        <div className="flex w-full shrink-0 flex-col overflow-y-auto border-l border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] lg:w-[430px]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[var(--bp-line)]" strokeWidth={1.5} />
              <h3 className="bp-label">Finding detail</h3>
            </div>
            <button
              onClick={() => setSelectedFinding(null)}
              aria-label="Close detail"
              className="text-[var(--bp-ink-dim)] transition-colors hover:text-[var(--bp-ink)]"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <SeverityBadge severity={selectedFinding.severity} />
                <span className="bp-mono text-[11px] text-[var(--bp-ink-dim)]">{selectedFinding.ruleId}</span>
              </div>
              <h2 className="text-[15px] font-semibold leading-snug text-[var(--bp-ink)]">{selectedFinding.title}</h2>
            </div>

            <div className="border border-[var(--bp-line-faint)] p-3">
              <div className="mb-1 flex items-center gap-2">
                <FileCode className="h-3.5 w-3.5 text-[var(--bp-line)]" strokeWidth={1.5} />
                <span className="break-all bp-mono text-[11px] text-[var(--bp-ink-dim)]">{selectedFinding.filePath}</span>
              </div>
              <p className="bp-mono text-[11px] text-[color-mix(in_oklab,var(--bp-ink-dim)_70%,transparent)]">
                Line {selectedFinding.lineNumber}
              </p>
            </div>

            <div>
              <p className="bp-label mb-2">Evidence — masked</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all border border-[var(--bp-line-faint)] bg-[var(--bp-ground)] p-3 bp-mono text-[11px]" style={{ color: 'var(--bp-alert)' }}>
                {selectedFinding.evidence}
              </pre>
            </div>

            <div>
              <p className="bp-label mb-2">Explanation</p>
              <p className="text-[13px] leading-relaxed text-[var(--bp-ink-dim)]">{selectedFinding.explanation}</p>
            </div>

            <div
              className="border p-4"
              style={{ borderColor: 'color-mix(in oklab, var(--bp-line) 22%, transparent)', background: 'color-mix(in oklab, var(--bp-line) 6%, transparent)' }}
            >
              <p className="mb-2 flex items-center gap-1.5 bp-label" style={{ color: 'var(--bp-line)' }}>
                <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                Suggested fix
              </p>
              <p className="text-[13px] leading-relaxed text-[var(--bp-ink-dim)]">{selectedFinding.suggestedFix}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Confidence', selectedFinding.confidence],
                ['Status', selectedFinding.status],
              ].map(([label, value]) => (
                <div key={label} className="border border-[var(--bp-line-faint)] p-3">
                  <p className="bp-label mb-1">{label}</p>
                  <p className="bp-mono text-[13px] capitalize text-[var(--bp-ink)]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
