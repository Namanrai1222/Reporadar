'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Star, GitFork, Globe, FileCode, Map, Shield, GitMerge, Leaf, BookOpen, Download } from 'lucide-react';
import type { Report } from '@/lib/types';

const NAV_ITEMS = [
  { href: '', label: 'Overview', icon: Globe },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/findings', label: 'Findings', icon: Shield },
  { href: '/routes', label: 'Routes', icon: GitMerge },
  { href: '/environment', label: 'Environment', icon: Leaf },
  { href: '/onboarding', label: 'Onboarding', icon: BookOpen },
];

export function ReportShell({
  children,
  report,
  reportId,
}: {
  children: React.ReactNode;
  report: Report | null;
  reportId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');

  const basePath = `/report/${reportId}`;

  const criticalCount = report?.findings.filter((f) => f.severity === 'critical').length ?? 0;
  const highCount = report?.findings.filter((f) => f.severity === 'high').length ?? 0;

  function navHref(suffix: string) {
    const base = `${basePath}${suffix}`;
    return dataParam ? `${base}?data=${encodeURIComponent(dataParam)}` : base;
  }

  const isActive = (suffix: string) => {
    const full = `${basePath}${suffix}`;
    if (suffix === '') return pathname === basePath;
    return pathname.startsWith(full);
  };

  return (
    <div className="min-h-screen bg-[#111416] flex flex-col">
      {/* Repository Header */}
      <header className="border-b border-[#364047] bg-[#181D20] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded bg-[#63D7D1]/20 flex items-center justify-center">
                  <FileCode className="w-3 h-3 text-[#63D7D1]" />
                </div>
                <a
                  href={report?.repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[15px] font-semibold text-[#F2F4F0] hover:text-[#63D7D1] font-mono transition-colors"
                >
                  {report ? `${report.repo.owner}/${report.repo.name}` : reportId}
                </a>
                {report?.repo.branch && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#22292D] text-[#A9B3B8] border border-[#364047]">
                    {report.repo.branch}
                  </span>
                )}
              </div>
              {report?.repo.description && (
                <p className="text-[13px] text-[#A9B3B8] ml-7">{report.repo.description}</p>
              )}
              <div className="flex items-center gap-4 ml-7 mt-2">
                {report?.repo.primaryLanguage && (
                  <span className="text-[11px] text-[#A9B3B8] font-mono">{report.repo.primaryLanguage}</span>
                )}
                {report?.repo.stars !== undefined && (
                  <span className="text-[11px] text-[#A9B3B8] flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {report.repo.stars.toLocaleString()}
                  </span>
                )}
                {report?.repo.forks !== undefined && (
                  <span className="text-[11px] text-[#A9B3B8] flex items-center gap-1">
                    <GitFork className="w-3 h-3" />
                    {report.repo.forks.toLocaleString()}
                  </span>
                )}
                {criticalCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#F07167]/15 text-[#F07167] border border-[#F07167]/30">
                    {criticalCount} critical
                  </span>
                )}
                {highCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#F1BC62]/15 text-[#F1BC62] border border-[#F1BC62]/30">
                    {highCount} high
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[#A9B3B8] border border-[#364047] hover:border-[#63D7D1] hover:text-[#63D7D1] transition-all">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-0 mt-5 -mb-4 overflow-x-auto">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={navHref(href)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive(href)
                    ? 'border-[#63D7D1] text-[#63D7D1]'
                    : 'border-transparent text-[#A9B3B8] hover:text-[#F2F4F0] hover:border-[#364047]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {href === '/findings' && report && report.findings.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#22292D] text-[#A9B3B8]">
                    {report.findings.length}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">{children}</main>
    </div>
  );
}
