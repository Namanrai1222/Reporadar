'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radar, GitBranch, ArrowRight, Lock, Map, BookOpen, Shield, Sparkles, Clock, Star, GitFork } from 'lucide-react';
import { GlobalRail } from '@/components/ui/GlobalRail';

const SCAN_MODES = [
  {
    id: 'full-map',
    icon: Map,
    label: 'Full Map',
    description: 'Interactive code map, security scan, and API dependency graph.',
    accent: '#63D7D1',
  },
  {
    id: 'security-lens',
    icon: Shield,
    label: 'Security Lens',
    description: 'Deep vulnerability scan, secret detection, and risk paths.',
    accent: '#F07167',
  },
  {
    id: 'onboarding',
    icon: BookOpen,
    label: 'Onboarding',
    description: 'AI-generated documentation and architecture walkthrough.',
    accent: '#B9A8FF',
  },
] as const;

const EXAMPLE_REPOS = [
  'https://github.com/vercel/next.js',
  'https://github.com/facebook/react',
  'https://github.com/shadcn-ui/ui',
];

const RECENT_SCANS = [
  { name: 'vercel/next.js', mode: 'full-map', time: '2 hours ago', stars: 128000, forks: 27000, findings: 3 },
  { name: 'supabase/supabase', mode: 'security-lens', time: '1 day ago', stars: 72000, forks: 6800, findings: 7 },
  { name: 'shadcn-ui/ui', mode: 'onboarding', time: '3 days ago', stars: 74000, forks: 4500, findings: 1 },
];

export default function HomePage() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [mode, setMode] = useState<'full-map' | 'security-lens' | 'onboarding'>('full-map');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleScan(url?: string) {
    const targetUrl = url || githubUrl;
    if (!targetUrl.trim()) {
      setError('Please enter a public GitHub repository URL.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: targetUrl, branch: branch || undefined, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed.');
      router.push(`/report/${data.report.id}?data=${encodeURIComponent(JSON.stringify(data.report))}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed. Please try again.');
      setLoading(false);
    }
  }

  function handleDemo() {
    handleScan('demo');
  }

  return (
    <div className="flex min-h-screen bg-[#111416]">
      <GlobalRail />

      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-[#364047] px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[#F2F4F0] tracking-tight">New Scan</h1>
            <p className="text-[13px] text-[#A9B3B8] mt-0.5">Analyze any public GitHub repository in seconds</p>
          </div>
          <button
            onClick={handleDemo}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[#A9B3B8] border border-[#364047] hover:border-[#63D7D1] hover:text-[#63D7D1] transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Try demo
          </button>
        </div>

        <div className="flex-1 flex gap-0">
          {/* Main Input Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full">
            {/* Big URL Input */}
            <div className="w-full">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <Radar className="w-4 h-4 text-[#A9B3B8]" />
                </div>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  placeholder="https://github.com/owner/repository"
                  className="w-full bg-[#181D20] border border-[#364047] text-[#F2F4F0] placeholder-[#364047] rounded-xl py-4 pl-11 pr-5 text-[15px] font-mono focus:outline-none focus:border-[#63D7D1] focus:ring-1 focus:ring-[#63D7D1]/30 transition-all"
                  disabled={loading}
                />
              </div>

              {/* Branch (optional) */}
              <div className="mt-2.5 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <GitBranch className="w-3.5 h-3.5 text-[#364047]" />
                </div>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="Branch (optional, defaults to main)"
                  className="w-full bg-[#181D20] border border-[#364047] text-[#F2F4F0] placeholder-[#364047] rounded-lg py-2.5 pl-10 pr-5 text-[13px] font-mono focus:outline-none focus:border-[#63D7D1]/60 transition-all"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="mt-3 px-4 py-2.5 rounded-lg bg-[#F07167]/10 border border-[#F07167]/30 text-[#F07167] text-[13px]">
                  {error}
                </div>
              )}

              {/* Example repos */}
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_REPOS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setGithubUrl(r)}
                    className="text-[11px] text-[#A9B3B8] font-mono px-2 py-1 rounded bg-[#22292D] hover:bg-[#364047] hover:text-[#F2F4F0] transition-all"
                  >
                    {r.replace('https://github.com/', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode selector */}
            <div className="w-full mt-6">
              <p className="text-[11px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-3">Scan Mode</p>
              <div className="grid grid-cols-3 gap-3">
                {SCAN_MODES.map(({ id, icon: Icon, label, description, accent }) => (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    className={`relative p-4 rounded-xl border text-left transition-all duration-150 ${
                      mode === id
                        ? 'border-[#364047] bg-[#22292D]'
                        : 'border-[#364047]/50 bg-[#181D20] hover:border-[#364047] hover:bg-[#22292D]'
                    }`}
                  >
                    {mode === id && (
                      <div
                        className="absolute inset-0 rounded-xl opacity-5"
                        style={{ background: `radial-gradient(circle at 50% 0%, ${accent}, transparent 60%)` }}
                      />
                    )}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: `${accent}20` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                    </div>
                    <p className="text-[13px] font-semibold text-[#F2F4F0] mb-1">{label}</p>
                    <p className="text-[11px] text-[#A9B3B8] leading-relaxed">{description}</p>
                    {mode === id && (
                      <div
                        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: accent }}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#111416]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => handleScan()}
              disabled={loading || !githubUrl.trim()}
              className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#63D7D1] text-[#111416] font-semibold text-[15px] transition-all duration-150 hover:bg-[#7ee5e0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#111416]/30 border-t-[#111416] rounded-full animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Radar className="w-4 h-4" />
                  Analyze Repository
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="mt-4 text-[11px] text-[#364047] text-center">
              <Lock className="inline w-3 h-3 mr-1" />
              We never store your source code. Only masked analysis results and metadata can be saved to your account.
            </p>
          </div>

          {/* Recent Scans Sidebar */}
          <div className="w-[280px] shrink-0 border-l border-[#364047] p-5 hidden lg:flex lg:flex-col">
            <p className="text-[11px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Recent Scans
            </p>
            <div className="flex flex-col gap-2">
              {RECENT_SCANS.map((scan) => (
                <button
                  key={scan.name}
                  onClick={() => setGithubUrl(`https://github.com/${scan.name}`)}
                  className="p-3 rounded-lg bg-[#181D20] border border-[#364047]/50 hover:border-[#364047] hover:bg-[#22292D] text-left transition-all group"
                >
                  <p className="text-[13px] font-mono text-[#F2F4F0] font-medium truncate group-hover:text-[#63D7D1] transition-colors">
                    {scan.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-[#A9B3B8] flex items-center gap-1">
                      <Star className="w-2.5 h-2.5" />
                      {(scan.stars / 1000).toFixed(0)}k
                    </span>
                    <span className="text-[11px] text-[#A9B3B8] flex items-center gap-1">
                      <GitFork className="w-2.5 h-2.5" />
                      {(scan.forks / 1000).toFixed(1)}k
                    </span>
                    <span className="text-[11px] text-[#F07167]">
                      {scan.findings} findings
                    </span>
                  </div>
                  <p className="text-[10px] text-[#364047] mt-1">{scan.time}</p>
                </button>
              ))}
            </div>

            {/* Feature list */}
            <div className="mt-6 pt-5 border-t border-[#364047]">
              <p className="text-[11px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-3">What we detect</p>
              <ul className="space-y-2">
                {[
                  ['🔑', 'Leaked secrets & API keys'],
                  ['🗺️', 'Interactive code maps'],
                  ['🛡️', 'Security vulnerabilities'],
                  ['🔗', 'API dependency graphs'],
                  ['🌿', 'Environment variable audit'],
                  ['📚', 'Onboarding documentation'],
                ].map(([emoji, text]) => (
                  <li key={text} className="flex items-center gap-2 text-[12px] text-[#A9B3B8]">
                    <span>{emoji}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
