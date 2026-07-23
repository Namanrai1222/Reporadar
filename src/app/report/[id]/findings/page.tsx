'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Finding, Report, Severity } from '@/lib/types';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { ChevronDown, ChevronUp, X, FileCode, AlertTriangle, CheckCircle, Eye } from 'lucide-react';

function getReport(dataParam: string | null): Report | null {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(dataParam)) as Report;
  } catch {
    return null;
  }
}

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
  const searchParams = useSearchParams();
  const report = getReport(searchParams.get('data'));

  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set());
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [sortField, setSortField] = useState<'severity' | 'file'>('severity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!report) {
    return (
      <div className="flex items-center justify-center py-24 text-[#A9B3B8] text-[13px]">
        No report data. Run a scan first.
      </div>
    );
  }

  function toggleSeverity(s: Severity) {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  }

  function handleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
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

  return (
    <div className="flex h-[calc(100vh-160px)] -mx-6 overflow-hidden">
      {/* Table */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all ${selectedFinding ? 'w-[55%]' : 'w-full'}`}>
        {/* Filters */}
        <div className="px-6 py-3 border-b border-[#364047] flex items-center gap-2 bg-[#181D20]">
          <span className="text-[11px] text-[#A9B3B8] mr-2">Filter:</span>
          {SEVERITY_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSeverity(s)}
              className={`px-2 py-1 rounded text-[11px] font-mono uppercase tracking-wide transition-all ${
                severityFilter.has(s) ? 'opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
            >
              <SeverityBadge severity={s} showDot />
            </button>
          ))}
          {severityFilter.size > 0 && (
            <button
              onClick={() => setSeverityFilter(new Set())}
              className="ml-auto text-[11px] text-[#A9B3B8] hover:text-[#F07167] transition-colors"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-[11px] text-[#A9B3B8]">{filtered.length} findings</span>
        </div>

        {/* Table header */}
        <div className="px-6 py-2 border-b border-[#364047] grid grid-cols-[80px_1fr_160px_80px] gap-4 bg-[#181D20]">
          <button
            onClick={() => handleSort('severity')}
            className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest flex items-center gap-1 hover:text-[#F2F4F0]"
          >
            Severity
            {sortField === 'severity' ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null}
          </button>
          <span className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest">Finding</span>
          <button
            onClick={() => handleSort('file')}
            className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest flex items-center gap-1 hover:text-[#F2F4F0]"
          >
            File
            {sortField === 'file' ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null}
          </button>
          <span className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest">Category</span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#A9B3B8]">
              <CheckCircle className="w-10 h-10 mb-3 text-[#63D7D1]" />
              <p className="text-[15px] font-medium text-[#F2F4F0]">No findings match the current filters</p>
            </div>
          ) : (
            filtered.map((finding) => (
              <button
                key={finding.id}
                onClick={() => setSelectedFinding(selectedFinding?.id === finding.id ? null : finding)}
                className={`w-full px-6 py-3 border-b border-[#364047]/50 grid grid-cols-[80px_1fr_160px_80px] gap-4 items-center text-left hover:bg-[#22292D] transition-colors ${
                  selectedFinding?.id === finding.id ? 'bg-[#22292D]' : ''
                }`}
              >
                <SeverityBadge severity={finding.severity} showDot />
                <div>
                  <p className="text-[13px] text-[#F2F4F0] font-medium truncate">{finding.title}</p>
                  <p className="text-[11px] text-[#A9B3B8] font-mono mt-0.5">Line {finding.lineNumber}</p>
                </div>
                <p className="text-[11px] font-mono text-[#A9B3B8] truncate">{finding.filePath.split('/').slice(-2).join('/')}</p>
                <span className="text-[10px] font-mono text-[#A9B3B8] truncate">
                  {CATEGORY_LABELS[finding.category] ?? finding.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedFinding && (
        <div className="w-[420px] shrink-0 border-l border-[#364047] bg-[#181D20] flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#364047] sticky top-0 bg-[#181D20] z-10">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#A9B3B8]" />
              <h3 className="text-[13px] font-semibold text-[#F2F4F0]">Finding Detail</h3>
            </div>
            <button onClick={() => setSelectedFinding(null)} className="text-[#A9B3B8] hover:text-[#F2F4F0]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SeverityBadge severity={selectedFinding.severity} />
                <span className="text-[11px] font-mono text-[#364047]">{selectedFinding.ruleId}</span>
              </div>
              <h2 className="text-[15px] font-semibold text-[#F2F4F0] leading-snug">{selectedFinding.title}</h2>
            </div>

            {/* Location */}
            <div className="p-3 rounded-lg bg-[#22292D] border border-[#364047]">
              <div className="flex items-center gap-2 mb-1">
                <FileCode className="w-3.5 h-3.5 text-[#A9B3B8]" />
                <span className="text-[11px] font-mono text-[#A9B3B8]">{selectedFinding.filePath}</span>
              </div>
              <p className="text-[11px] text-[#364047] font-mono">Line {selectedFinding.lineNumber}</p>
            </div>

            {/* Evidence */}
            <div>
              <p className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-2">Evidence (Masked)</p>
              <pre className="p-3 rounded-lg bg-[#0d1014] border border-[#364047] text-[11px] font-mono text-[#F1BC62] overflow-x-auto whitespace-pre-wrap break-all">
                {selectedFinding.evidence}
              </pre>
            </div>

            {/* Explanation */}
            <div>
              <p className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-2">Explanation</p>
              <p className="text-[13px] text-[#A9B3B8] leading-relaxed">{selectedFinding.explanation}</p>
            </div>

            {/* Fix */}
            <div className="p-4 rounded-lg bg-[#63D7D1]/5 border border-[#63D7D1]/20">
              <p className="text-[10px] font-medium text-[#63D7D1] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Suggested Fix
              </p>
              <p className="text-[13px] text-[#A9B3B8] leading-relaxed">{selectedFinding.suggestedFix}</p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#22292D]">
                <p className="text-[10px] text-[#A9B3B8] mb-1">Confidence</p>
                <p className="text-[13px] font-mono text-[#F2F4F0] capitalize">{selectedFinding.confidence}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#22292D]">
                <p className="text-[10px] text-[#A9B3B8] mb-1">Status</p>
                <p className="text-[13px] font-mono text-[#F2F4F0] capitalize">{selectedFinding.status}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
