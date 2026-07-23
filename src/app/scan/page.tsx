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

  const repoUrl = searchParams.get('repo') || 'Analyzing repository…';

  useEffect(() => {
    let stage = 0;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const advance = () => {
      if (cancelled) return;
      if (stage < STAGES.length - 1) {
        setCompletedStages((prev) => [...prev, STAGES[stage].id]);
        stage++;
        setCurrentStage(stage);

        if (stage === 2) setDiscoveries((p) => [...p, 'Detected: Next.js 14, TypeScript, Tailwind CSS']);
        if (stage === 3) setDiscoveries((p) => [...p, 'Found: 12 API routes, 34 components']);
        if (stage === 4) setDiscoveries((p) => [...p, 'Warning: Possible secret in src/config.ts']);
        if (stage === 5) setDiscoveries((p) => [...p, 'Found: 3 undocumented environment variables']);

        timer = setTimeout(advance, STAGES[stage].duration);
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

    timer = setTimeout(advance, STAGES[0].duration);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  const pct = Math.round((completedStages.length / STAGES.length) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bp-ground)] lg:flex-row">
      {/* Left: stage timeline */}
      <div className="bp-paper flex flex-1 flex-col px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto w-full max-w-lg">
          <p className="bp-label mb-2">FIG.02 — SCAN IN PROGRESS</p>
          <h1 className="text-[20px] font-semibold text-[var(--bp-ink)]">Analyzing repository</h1>
          <p className="mt-1 truncate bp-mono text-[12.5px] text-[var(--bp-ink-dim)]">{repoUrl}</p>

          {/* progress dimension bar */}
          <div className="mt-6 mb-9">
            <div className="mb-1.5 flex items-center justify-between bp-mono text-[10px] text-[var(--bp-line)]">
              <span>PROGRESS</span>
              <span>{pct}%</span>
            </div>
            <div className="relative h-[6px] border border-[var(--bp-line-faint)]">
              <div
                className="absolute inset-y-0 left-0 bg-[var(--bp-line)] transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <ol className="flex flex-col">
            {STAGES.map((stage, index) => {
              const done = completedStages.includes(stage.id);
              const active = index === currentStage && !done;

              return (
                <li key={stage.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center border transition-colors duration-300 ${
                        done
                          ? 'border-[var(--bp-line)] bg-[var(--bp-line)]'
                          : active
                            ? 'border-[var(--bp-line)]'
                            : 'border-[var(--bp-line-faint)]'
                      }`}
                    >
                      {done ? (
                        <Check className="h-3 w-3 text-[var(--bp-ground)]" strokeWidth={2.5} />
                      ) : active ? (
                        <Loader2 className="h-3 w-3 animate-spin text-[var(--bp-line)]" />
                      ) : null}
                    </span>
                    {index < STAGES.length - 1 && (
                      <span
                        className={`mt-1 h-8 w-px transition-colors duration-300 ${
                          done ? 'bg-[var(--bp-line-soft)]' : 'bg-[var(--bp-line-faint)]'
                        }`}
                      />
                    )}
                  </div>

                  <div className="pb-8">
                    <p
                      className={`bp-mono text-[12.5px] transition-colors duration-300 ${
                        done
                          ? 'text-[var(--bp-ink-dim)]'
                          : active
                            ? 'text-[var(--bp-ink)]'
                            : 'text-[color-mix(in_oklab,var(--bp-ink-dim)_50%,transparent)]'
                      }`}
                    >
                      <span className="mr-2 text-[10px] text-[var(--bp-line)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {stage.label}
                    </p>
                    {done && <p className="mt-0.5 bp-mono text-[10px] text-[var(--bp-line)]">[OK]</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Right: live log */}
      <aside className="flex w-full shrink-0 flex-col border-t border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] p-5 md:p-6 lg:w-[380px] lg:border-l lg:border-t-0">
        <p className="bp-label mb-1">LIVE LOG</p>
        <p className="mb-4 text-[11.5px] text-[var(--bp-ink-dim)]">
          Findings are masked until analysis completes.
        </p>

        <div className="flex flex-1 flex-col gap-2">
          {discoveries.map((d, i) => {
            const warn = d.includes('Warning');
            return (
              <div
                key={i}
                className="flex items-start gap-2.5 border border-[var(--bp-line-faint)] p-3 bp-mono text-[11.5px] leading-relaxed text-[var(--bp-ink-dim)]"
                style={warn ? { borderColor: 'color-mix(in oklab, var(--bp-alert) 45%, transparent)' } : undefined}
              >
                {warn ? (
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--bp-alert)]" strokeWidth={1.5} />
                ) : (
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-[var(--bp-line)]" />
                )}
                {d}
              </div>
            );
          })}
          {discoveries.length === 0 && (
            <div className="flex items-center gap-2 bp-mono text-[11.5px] text-[color-mix(in_oklab,var(--bp-ink-dim)_60%,transparent)]">
              <span>&gt;</span>
              <span className="inline-block h-[1.05em] w-[0.55ch] animate-pulse bg-[var(--bp-line)]" />
              waiting for discoveries
            </div>
          )}
        </div>

        <p className="mt-4 border-t border-[var(--bp-line-faint)] pt-4 bp-mono text-[10px] leading-relaxed text-[color-mix(in_oklab,var(--bp-ink-dim)_70%,transparent)]">
          Static analysis only. AI explanations are heuristic and may contain false positives.
        </p>
      </aside>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bp-ground)]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--bp-line-faint)] border-t-[var(--bp-line)]" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
