'use client';

import { useSearchParams } from 'next/navigation';
import type { Report } from '@/lib/types';
import { BookOpen, Code, Shield, GitBranch, Layers, ArrowRight } from 'lucide-react';

function getReport(dataParam: string | null): Report | null {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(dataParam)) as Report;
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const report = getReport(searchParams.get('data'));

  if (!report) {
    return (
      <div className="flex items-center justify-center py-24 text-[#A9B3B8] text-[13px]">
        No report data. Run a scan first.
      </div>
    );
  }

  const apiCount = report.nodes.filter((n) => n.type === 'api_route').length;
  const pageCount = report.nodes.filter((n) => n.type === 'client_page').length;
  const envCount = report.nodes.filter((n) => n.type === 'env_var').length;
  const criticalCount = report.findings.filter((f) => f.severity === 'critical').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* AI Doc Header */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-[#B9A8FF]/10 to-[#63D7D1]/5 border border-[#B9A8FF]/30">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#B9A8FF]/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-[#B9A8FF]" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#F2F4F0]">
              {report.repo.owner}/{report.repo.name}
            </h2>
            <p className="text-[13px] text-[#A9B3B8] mt-1">
              {report.repo.description || 'A repository analyzed by RepoRadar.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {report.stack.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#22292D] text-[#A9B3B8] border border-[#364047]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'API Routes', value: apiCount, color: '#63D7D1', icon: Code },
          { label: 'Client Pages', value: pageCount, color: '#B9A8FF', icon: Layers },
          { label: 'Env Variables', value: envCount, color: '#F1BC62', icon: Shield },
          { label: 'Critical Issues', value: criticalCount, color: '#F07167', icon: Shield },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl bg-[#181D20] border border-[#364047] text-center">
            <Icon className="w-4 h-4 mx-auto mb-2" style={{ color }} />
            <p className="text-[20px] font-bold font-mono" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#A9B3B8] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Getting Started */}
      <div className="p-5 rounded-xl bg-[#181D20] border border-[#364047]">
        <h3 className="text-[14px] font-semibold text-[#F2F4F0] flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-[#63D7D1]" />
          Getting Started
        </h3>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Clone the repository', code: `git clone ${report.repo.url}` },
            { step: '2', title: 'Install dependencies', code: 'npm install' },
            { step: '3', title: 'Set up environment variables', code: 'cp .env.example .env.local' },
            { step: '4', title: 'Start development server', code: 'npm run dev' },
          ].map(({ step, title, code }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#22292D] border border-[#364047] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-mono text-[#A9B3B8]">{step}</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] text-[#F2F4F0] font-medium">{title}</p>
                <code className="block mt-1 px-3 py-1.5 rounded bg-[#0d1014] border border-[#364047] text-[12px] font-mono text-[#63D7D1]">
                  {code}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="p-5 rounded-xl bg-[#181D20] border border-[#364047]">
        <h3 className="text-[14px] font-semibold text-[#F2F4F0] flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-[#B9A8FF]" />
          Architecture Overview
        </h3>
        <div className="space-y-3">
          {[
            {
              title: 'Client Layer',
              desc: `${pageCount} detected client pages and components. These are bundled and served to the browser.`,
              color: '#B9A8FF',
            },
            {
              title: 'Application Layer',
              desc: `${apiCount} API routes handle server-side logic, auth, and data processing.`,
              color: '#63D7D1',
            },
            {
              title: 'Data / Config Layer',
              desc: `${envCount} environment variables configure the application. Secrets are server-only.`,
              color: '#F1BC62',
            },
          ].map(({ title, desc, color }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
              <div>
                <p className="text-[13px] font-semibold" style={{ color }}>{title}</p>
                <p className="text-[12px] text-[#A9B3B8] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Checklist */}
      {report.findings.length > 0 && (
        <div className="p-5 rounded-xl bg-[#181D20] border border-[#364047]">
          <h3 className="text-[14px] font-semibold text-[#F2F4F0] flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#F07167]" />
            Security Checklist for New Contributors
          </h3>
          <div className="space-y-2">
            {report.findings.slice(0, 5).map((finding) => (
              <div key={finding.id} className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-[#364047] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] text-[#F2F4F0] font-medium">{finding.title}</p>
                  <p className="text-[11px] text-[#A9B3B8]">{finding.suggestedFix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Markdown Report */}
      <details className="p-5 rounded-xl bg-[#181D20] border border-[#364047] group">
        <summary className="text-[13px] font-semibold text-[#F2F4F0] cursor-pointer flex items-center gap-2 select-none">
          <Code className="w-4 h-4 text-[#63D7D1]" />
          Full Markdown Report
          <span className="ml-auto text-[11px] text-[#A9B3B8] group-open:hidden">Show</span>
          <span className="ml-auto text-[11px] text-[#A9B3B8] hidden group-open:block">Hide</span>
        </summary>
        <pre className="mt-4 p-4 rounded-lg bg-[#0d1014] border border-[#364047] text-[11px] font-mono text-[#A9B3B8] overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {report.markdown}
        </pre>
      </details>
    </div>
  );
}
