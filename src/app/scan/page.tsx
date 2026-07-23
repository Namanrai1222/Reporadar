'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, AlertTriangle, Loader2 } from 'lucide-react';

const STAGES = [
  { id: 'validating', label: 'Validating repository URL', duration: 500 },
  { id: 'indexing', label: 'Indexing file tree', duration: 1200 },
  { id: 'detecting_structure', label: 'Detecting architecture & stack', duration: 1500 },
  { id: 'mapping_relations', label: 'Mapping component relationships', duration: 1800 },
  { id: 'scanning_security', label: 'Running security scanners', duration: 2000 },
  { id: 'building_report', label: 'Building analysis report', duration: 1000 },
  { id: 'explaining_optional', label: 'Generating AI explanations', duration: 800 },
  { id: 'complete', label: 'Analysis complete', duration: 0 },
];

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState(0);
  const [discoveries, setDiscoveries] = useState<string[]>([]);

  const repoUrl = searchParams.get('repo') || 'Analyzing repository...';

  useEffect(() => {
    let stage = 0;
    const advance = () => {
      if (stage < STAGES.length - 1) {
        setCompletedStages((prev) => [...prev, STAGES[stage].id]);
        stage++;
        setCurrentStage(stage);

        if (stage === 2) setDiscoveries((p) => [...p, 'Detected: Next.js 14, TypeScript, Tailwind CSS']);
        if (stage === 3) setDiscoveries((p) => [...p, 'Found: 12 API routes, 34 components']);
        if (stage === 4) setDiscoveries((p) => [...p, 'Warning: Possible secret in src/config.ts']);
        if (stage === 5) setDiscoveries((p) => [...p, 'Found: 3 undocumented environment variables']);

        setTimeout(advance, STAGES[stage].duration);
      } else {
        setCompletedStages((prev) => [...prev, STAGES[stage].id]);
        const reportData = sessionStorage.getItem('pending_report');
        if (reportData) {
          const report = JSON.parse(reportData);
          sessionStorage.removeItem('pending_report');
          router.push(`/report/${report.id}`);
        }
      }
    };

    setTimeout(advance, STAGES[0].duration);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#111416] flex">
      {/* Left: Stage timeline */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-[20px] font-semibold text-[#F2F4F0] mb-1">Analyzing Repository</h1>
          <p className="text-[13px] text-[#A9B3B8] font-mono mb-8 truncate">{repoUrl}</p>

          <div className="flex flex-col gap-0">
            {STAGES.map((stage, index) => {
              const done = completedStages.includes(stage.id);
              const active = index === currentStage && !done;

              return (
                <div key={stage.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        done
                          ? 'bg-[#63D7D1] border border-[#63D7D1]'
                          : active
                          ? 'bg-transparent border-2 border-[#63D7D1]'
                          : 'bg-transparent border border-[#364047]'
                      }`}
                    >
                      {done ? (
                        <Check className="w-3 h-3 text-[#111416]" />
                      ) : active ? (
                        <Loader2 className="w-3 h-3 text-[#63D7D1] animate-spin" />
                      ) : null}
                    </div>
                    {index < STAGES.length - 1 && (
                      <div className={`w-px h-8 mt-1 ${done ? 'bg-[#63D7D1]/40' : 'bg-[#364047]'}`} />
                    )}
                  </div>

                  <div className="pb-8">
                    <p
                      className={`text-[13px] transition-all duration-300 ${
                        done ? 'text-[#A9B3B8]' : active ? 'text-[#F2F4F0] font-medium' : 'text-[#364047]'
                      }`}
                    >
                      {stage.label}
                    </p>
                    {done && <p className="text-[11px] text-[#63D7D1] mt-0.5">Done</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Live discoveries */}
      <div className="w-[360px] shrink-0 border-l border-[#364047] bg-[#181D20] p-6 flex flex-col">
        <h2 className="text-[13px] font-semibold text-[#F2F4F0] mb-1">Live Discoveries</h2>
        <p className="text-[11px] text-[#A9B3B8] mb-4">Findings are masked until analysis completes.</p>

        <div className="flex flex-col gap-2 flex-1">
          {discoveries.map((d, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-[#22292D] border border-[#364047] text-[12px] text-[#A9B3B8] flex items-start gap-2"
            >
              {d.includes('Warning') ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[#F1BC62] shrink-0 mt-0.5" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-[#63D7D1]/20 border border-[#63D7D1]/40 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1 h-1 rounded-full bg-[#63D7D1]" />
                </div>
              )}
              {d}
            </div>
          ))}
          {discoveries.length === 0 && (
            <div className="text-[12px] text-[#364047] font-mono">Waiting for discoveries...</div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[#364047]">
          <p className="text-[10px] text-[#364047]">
            Results are static analysis only. AI explanations are heuristic and may have false positives.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#111416] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#364047] border-t-[#63D7D1] rounded-full animate-spin" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
