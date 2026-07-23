'use client';

import { useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Map as MapIcon, ShieldAlert, BookOpen, Star, GitFork, Download, CheckCircle2 } from 'lucide-react';

type Mode = 'map' | 'security' | 'onboarding';

const MODES: { id: Mode; label: string; icon: typeof MapIcon; glow1: string; glow2: string; soft: string }[] = [
  { id: 'map', label: 'Full Map', icon: MapIcon, glow1: '#ff8a45', glow2: '#ffd08a', soft: '#ff7a45' },
  { id: 'security', label: 'Security', icon: ShieldAlert, glow1: '#ff6b5e', glow2: '#ffb4a0', soft: '#ff5b52' },
  { id: 'onboarding', label: 'Onboarding', icon: BookOpen, glow1: '#5fe3d6', glow2: '#bff6ee', soft: '#37c7ba' },
];

export function HeroStage() {
  const [mode, setMode] = useState<Mode>('map');
  const active = MODES.find((m) => m.id === mode)!;

  const glowStyle = {
    ['--glow-1' as string]: active.glow1,
    ['--glow-2' as string]: active.glow2,
    ['--glow-soft' as string]: active.soft,
  } as CSSProperties;

  return (
    <div className="relative">
      {/* Segmented control — the "day / night" gesture */}
      <div className="relative z-20 mx-auto mb-9 flex w-fit items-center gap-1 rounded-full border border-[var(--hairline)] bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] p-1 backdrop-blur-md">
        {MODES.map((m) => {
          const on = m.id === mode;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-200"
              style={{ color: on ? '#0b0a09' : 'var(--text-muted)' }}
            >
              {on && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: `linear-gradient(180deg, ${m.glow2}, ${m.glow1})` }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stage: eclipse light + floating product panel */}
      <div className="relative" style={glowStyle}>
        <div className="scan-horizon">
          <div className="eclipse" />
          <div className="horizon-wash" />
        </div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="relative z-10 mx-auto w-full max-w-[860px] px-4"
        >
          <div className="stage-panel overflow-hidden rounded-2xl bg-[color-mix(in_oklab,#0c0f12_88%,transparent)] backdrop-blur-xl">
            <DashboardChrome accent={active.glow1} />
            <div className="relative min-h-[280px] p-5 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {mode === 'map' && <MapBody accent={active.glow1} />}
                  {mode === 'security' && <SecurityBody accent={active.glow1} />}
                  {mode === 'onboarding' && <OnboardingBody accent={active.glow1} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- shared chrome ---------- */
function DashboardChrome({ accent }: { accent: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
      <div className="flex items-center gap-3">
        <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `color-mix(in oklab, ${accent} 20%, transparent)` }}>
          <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        </span>
        <span className="font-mono text-[13px] font-medium text-[var(--text-strong)]">facebook/react</span>
        <span className="hidden rounded border border-[var(--hairline)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-faint)] sm:inline">main</span>
        <span className="hidden items-center gap-1 text-[11px] text-[var(--text-faint)] sm:flex">
          <Star className="h-3 w-3" /> 228k
        </span>
        <span className="hidden items-center gap-1 text-[11px] text-[var(--text-faint)] sm:flex">
          <GitFork className="h-3 w-3" /> 46k
        </span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hairline)] px-2.5 py-1.5 text-[11px] text-[var(--text-muted)]">
        <Download className="h-3 w-3" /> Export
      </span>
    </div>
  );
}

function StatRow({ items }: { items: [string, string][] }) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-3">
      {items.map(([v, l], i) => (
        <div key={i} className="rounded-xl border border-[var(--hairline)] bg-[color-mix(in_oklab,var(--surface)_50%,transparent)] px-4 py-3">
          <div className="font-display text-[22px] font-semibold text-[var(--text-strong)]">{v}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-faint)]">{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Full Map ---------- */
function MapBody({ accent }: { accent: string }) {
  return (
    <div>
      <StatRow items={[['112', 'Components'], ['47', 'API routes'], ['9', 'Data flows']] as [string, string][]} />
      <div className="rounded-xl border border-[var(--hairline)] bg-[color-mix(in_oklab,#0a0d10_70%,transparent)] p-4">
        <svg viewBox="0 0 620 150" className="h-[150px] w-full">
          <defs>
            <linearGradient id="mapedge" x1="0" x2="1">
              <stop offset="0" stopColor={accent} stopOpacity="0.7" />
              <stop offset="1" stopColor="#5fe3d6" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {[[90, 40, 300, 75], [300, 75, 520, 40], [300, 75, 500, 118], [300, 75, 130, 118], [90, 40, 130, 118], [520, 40, 560, 95]].map(
            ([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#mapedge)" strokeWidth="1.4" />
            ),
          )}
          {[
            [300, 75, 9, accent, 'app/'],
            [90, 40, 5, '#5fe3d6', 'ui'],
            [520, 40, 5, '#b9a8ff', 'api'],
            [500, 118, 6, '#ff6b5e', 'auth'],
            [130, 118, 4, '#6a7883', 'lib'],
            [560, 95, 4, '#6a7883', ''],
          ].map(([cx, cy, r, c, label], i) => (
            <g key={i}>
              <circle cx={cx as number} cy={cy as number} r={r as number} fill={c as string} />
              {label ? (
                <text x={(cx as number) + 10} y={(cy as number) + 3} fill="#97a3ab" fontSize="9" fontFamily="monospace">
                  {label as string}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ---------- Security ---------- */
function SecurityBody({ accent }: { accent: string }) {
  const findings: [string, string, string][] = [
    ['CRITICAL', 'Hardcoded secret · src/config.ts', '#ff6b5e'],
    ['HIGH', 'Missing auth on /api/admin', '#f5b855'],
    ['MEDIUM', 'Unvalidated redirect · routes/go.ts', '#b9a8ff'],
    ['LOW', 'Verbose error leak · lib/db.ts', '#5fe3d6'],
  ];
  return (
    <div>
      <StatRow items={[['3', 'Critical'], ['5', 'High'], ['B+', 'Risk grade']] as [string, string][]} />
      <div className="flex flex-col gap-2">
        {findings.map(([sev, text, c], i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--hairline)] bg-[color-mix(in_oklab,var(--surface)_45%,transparent)] px-3.5 py-2.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
            <span className="w-[70px] shrink-0 font-mono text-[10px] tracking-wide" style={{ color: c }}>{sev}</span>
            <span className="truncate font-mono text-[12px] text-[var(--text-muted)]">{text}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-right font-mono text-[10px]" style={{ color: accent }}>secrets masked in memory ✓</div>
    </div>
  );
}

/* ---------- Onboarding ---------- */
function OnboardingBody({ accent }: { accent: string }) {
  const steps = ['Install deps · pnpm i', 'Set 3 env vars (see below)', 'Run the dev server', 'Entry: app/router.tsx'];
  return (
    <div>
      <StatRow items={[['Next.js', 'Framework'], ['TS', 'Language'], ['4', 'Setup steps']] as [string, string][]} />
      <div className="rounded-xl border border-[var(--hairline)] bg-[color-mix(in_oklab,#0a0d10_70%,transparent)] p-4">
        <div className="mb-3 text-[11px] uppercase tracking-[0.16em] text-[var(--text-faint)]">Generated quickstart</div>
        <div className="flex flex-col gap-2.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-[13px] text-[var(--text-muted)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: accent }} />
              <span className="font-mono">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
