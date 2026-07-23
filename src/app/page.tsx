'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, GitBranch, Shield, Map as MapIcon, BookOpen,
  ShieldAlert, Key, Link2, FileCode, Database, ArrowUpRight,
} from 'lucide-react';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { BlueprintSchematic } from '@/components/landing/BlueprintSchematic';
import { RepoRadarLogo } from '@/components/brand/RepoRadarLogo';

// 3D isometric wireframe — progressively enhances the 2D schematic
const Axonometric = dynamic(() => import('@/components/landing/Axonometric').then((m) => m.Axonometric), {
  ssr: false,
  loading: () => <BlueprintSchematic />,
});

/* ============================================================ Nav */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={`transition-colors duration-300 ${
          scrolled
            ? 'border-b border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground)_82%,transparent)] backdrop-blur-md'
            : 'border-b border-transparent'
        }`}
      >
        <nav className="mx-auto flex max-w-[1320px] items-center justify-between px-8 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <RepoRadarLogo size={30} wordClassName="text-[15px]" />
            <span className="bp-label hidden whitespace-nowrap xl:inline">/ static analysis</span>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {['Features', 'How it works', 'Security'].map((item, i) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="whitespace-nowrap bp-mono text-[12px] tracking-wide text-[var(--bp-ink-dim)] transition-colors hover:text-[var(--bp-ink)]"
              >
                <span className="text-[var(--bp-line)]">{String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp;{item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <Link
              href="/signin"
              className="bp-mono hidden whitespace-nowrap text-[12px] tracking-wide text-[var(--bp-ink-dim)] transition-colors hover:text-[var(--bp-ink)] lg:block"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center gap-2 whitespace-nowrap border border-[var(--bp-line)] px-4 py-2 bp-mono text-[12px] tracking-wide text-[var(--bp-ink)] transition-colors hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)]"
            >
              <span className="bp-reg" /><span className="bp-reg br" />
              Analyze
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>
      </div>
    </motion.header>
  );
}


/* ============================================================ Repo input — drafted spec field */
function RepoInput() {
  const [url, setUrl] = useState('');
  return (
    <div className="relative">
      <div className="bp-label mb-2 flex items-center justify-between">
        <span>INPUT — TARGET REPOSITORY</span>
        <span className="text-[var(--bp-ink-dim)]">public · https</span>
      </div>
      <div className="group relative flex items-stretch border border-[var(--bp-line-soft)] bg-[color-mix(in_oklab,var(--bp-ground-2)_70%,transparent)] transition-colors focus-within:border-[var(--bp-line)]">
        <span className="bp-reg" />
        <span className="bp-reg tr" />
        <span className="bp-reg bl" />
        <span className="bp-reg br" />
        <span className="grid place-items-center pl-4 pr-3 text-[var(--bp-line)]">
          <GitBranch className="h-[18px] w-[18px]" />
        </span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="github.com/facebook/react"
          spellCheck={false}
          className="peer w-full flex-1 bg-transparent bp-mono text-[14px] text-[var(--bp-ink)] outline-none placeholder:text-[color-mix(in_oklab,var(--bp-ink-dim)_60%,transparent)]"
        />
        <Link
          href="/dashboard"
          className="group/btn relative inline-flex shrink-0 items-center gap-2 border-l border-[var(--bp-line-soft)] bg-[color-mix(in_oklab,var(--bp-line)_10%,transparent)] px-5 bp-mono text-[12px] tracking-wide text-[var(--bp-ink)] transition-colors hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)]"
        >
          RUN SCAN
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ============================================================ Hero — blueprint sheet */
function Hero() {
  return (
    <section className="bp-paper relative min-h-[100svh] overflow-hidden pt-24">
      <div className="bp-vignette pointer-events-none absolute inset-0 z-[1]" />

      {/* section registration marks */}
      <span className="bp-reg" style={{ top: 88, left: 24 }} />
      <span className="bp-reg tr" style={{ top: 88, right: 24 }} />

      <div className="relative z-10 mx-auto max-w-[1320px] px-8">
        {/* sheet header strip */}
        <Reveal from="none">
          <div className="flex items-center justify-between border-b border-[var(--bp-line-faint)] pb-3 bp-label">
            <span>REPORADAR · REPOSITORY X-RAY</span>
            <span className="hidden sm:inline text-[var(--bp-ink-dim)]">SHEET 01 / 04 — REV A — SCALE 1:1</span>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 items-center gap-x-12 gap-y-14 pt-12 lg:grid-cols-[1.02fr_1fr] lg:pt-16">
          {/* left — headline + drafted input */}
          <div>
            <Reveal from="up">
              <p className="bp-label mb-6">FIG.01 — DETERMINISTIC ANALYSIS</p>
            </Reveal>

            <h1 className="font-display text-[clamp(2.7rem,5.6vw,4.6rem)] font-semibold leading-[1.02] text-[var(--bp-ink)]">
              <SplitLine text="X-ray vision" delay={0.05} />
              <SplitLine text="for any repository." delay={0.13} />
            </h1>

            {/* dimension line under the headline */}
            <Reveal from="none" delay={0.3}>
              <div className="mt-6 flex items-center gap-3 text-[var(--bp-line)]">
                <span className="h-2 w-px bg-[var(--bp-line-soft)]" />
                <span className="h-px flex-1 bg-[var(--bp-line-faint)]" />
                <span className="bp-mono text-[10px]">30s · 10 SCANNERS · 0 STORED</span>
                <span className="h-px flex-1 bg-[var(--bp-line-faint)]" />
                <span className="h-2 w-px bg-[var(--bp-line-soft)]" />
              </div>
            </Reveal>

            <Reveal from="up" delay={0.36}>
              <p className="mt-7 max-w-[34rem] text-[16px] leading-relaxed text-[var(--bp-ink-dim)]">
                Paste a URL. RepoRadar drafts the architecture, flags leaked secrets and weak auth, and writes
                grounded onboarding docs — statically. Nothing executed. No source stored.
              </p>
            </Reveal>

            <Reveal from="up" delay={0.46}>
              <div className="mt-9 max-w-[34rem]">
                <RepoInput />
              </div>
            </Reveal>
          </div>

          {/* right — schematic drawing area */}
          <Reveal from="left" delay={0.2}>
            <figure className="relative">
              <div className="bp-frame relative aspect-[68/47] w-full overflow-hidden bg-[color-mix(in_oklab,var(--bp-ground-2)_60%,transparent)]">
                <span className="bp-reg z-20" style={{ top: -1, left: -1 }} />
                <span className="bp-reg tr z-20" style={{ top: -1, right: -1 }} />
                <span className="bp-reg bl z-20" style={{ bottom: -1, left: -1 }} />
                <span className="bp-reg br z-20" style={{ bottom: -1, right: -1 }} />

                {/* 3D isometric wireframe drawing */}
                <div className="absolute inset-0">
                  <Axonometric />
                </div>

                {/* 2D drafting overlays keep the drawing language */}
                <div className="pointer-events-none absolute inset-x-5 top-4 z-10 flex items-center gap-2 text-[var(--bp-line)]">
                  <span className="h-2 w-px bg-[var(--bp-line-soft)]" />
                  <span className="h-px flex-1 bg-[var(--bp-line-faint)]" />
                  <span className="bp-mono text-[9px]">1200u</span>
                  <span className="h-px flex-1 bg-[var(--bp-line-faint)]" />
                  <span className="h-2 w-px bg-[var(--bp-line-soft)]" />
                </div>
                <span className="bp-mono pointer-events-none absolute bottom-3 left-5 z-10 text-[9px] text-[var(--bp-ink-dim)]">
                  FIG.01 — AXONOMETRIC · facebook/react
                </span>
                <span className="bp-mono pointer-events-none absolute right-5 top-4 z-10 text-[9px] text-[var(--bp-line)]">
                  ISO · 1:1
                </span>
              </div>

              {/* engineering title block */}
              <div className="mt-[-1px] grid grid-cols-4 border border-[var(--bp-line-faint)] border-t-0 bp-mono text-[10px]">
                {[
                  ['DRAWING', 'RR-0001'],
                  ['SCALE', '1:1'],
                  ['UNITS', 'LOC'],
                  ['REV', 'A'],
                ].map(([k, v], i) => (
                  <div key={k} className={`px-3 py-2 ${i < 3 ? 'border-r border-[var(--bp-line-faint)]' : ''}`}>
                    <div className="text-[9px] tracking-[0.16em] text-[var(--bp-line)]">{k}</div>
                    <div className="mt-0.5 text-[var(--bp-ink)]">{v}</div>
                  </div>
                ))}
              </div>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** headline line that clips-in from below, word-safe */
function SplitLine({ text, delay }: { text: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: reduce ? 0 : '110%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {text}
      </motion.span>
    </span>
  );
}

/* ============================================================ Readout */
const CONSOLE_LINES = [
  { text: 'clone repository metadata', tag: 'OK', color: 'var(--bp-line)' },
  { text: 'map 112 components · 47 routes', tag: 'OK', color: 'var(--bp-line)' },
  { text: 'secret pattern · src/config.ts', tag: 'CRIT', color: 'var(--bp-critical)' },
  { text: '3 undocumented env variables', tag: 'WARN', color: 'var(--bp-alert)' },
  { text: 'report drafted in 18.4s', tag: 'DONE', color: 'var(--bp-line)' },
];

function LiveReadout() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % (CONSOLE_LINES.length + 1)), 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bp-frame relative bg-[color-mix(in_oklab,var(--bp-ground-2)_60%,transparent)]">
      <span className="bp-reg" style={{ top: -1, left: -1 }} />
      <span className="bp-reg tr" style={{ top: -1, right: -1 }} />
      <span className="bp-reg bl" style={{ bottom: -1, left: -1 }} />
      <span className="bp-reg br" style={{ bottom: -1, right: -1 }} />
      <div className="flex items-center justify-between border-b border-[var(--bp-line-faint)] px-4 py-2.5 bp-label">
        <span>SCAN LOG — reporadar/engine</span>
        <span className="text-[var(--bp-ink-dim)]">stdout</span>
      </div>
      <div className="min-h-[232px] p-5 bp-mono text-[12.5px] leading-[1.9]">
        {CONSOLE_LINES.map((line, i) => {
          if (i > step) return null;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3"
            >
              <span className="w-11 shrink-0 text-[10px]" style={{ color: line.color }}>
                [{line.tag}]
              </span>
              <span style={{ color: i === step ? 'var(--bp-ink)' : 'var(--bp-ink-dim)' }}>{line.text}</span>
            </motion.div>
          );
        })}
        {step < CONSOLE_LINES.length && (
          <div className="mt-1 flex items-center gap-2 text-[var(--bp-line)]">
            <span className="bp-mono text-[10px]">&gt;</span>
            <span className="inline-block h-[1.05em] w-[0.55ch] animate-pulse bg-[var(--bp-line)] align-text-bottom" />
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessSection() {
  return (
    <section className="bp-paper relative border-t border-[var(--bp-line-faint)] py-24 md:py-28">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-14 px-8 lg:grid-cols-2">
        <div>
          <Reveal><p className="bp-label mb-5">FIG.02 — ANALYSIS PIPELINE</p></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-display text-[clamp(1.9rem,4vw,2.9rem)] font-semibold text-[var(--bp-ink)]">
              Ten scanners, one pass, <br className="hidden sm:block" />zero code executed.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-[15.5px] leading-relaxed text-[var(--bp-ink-dim)]">
              RepoRadar fetches the tree, resolves the architecture, and runs every scanner in parallel — purely
              statically. Secrets are masked in memory before a single pixel renders.
            </p>
          </Reveal>

          <RevealGroup className="mt-9 flex flex-col" stagger={0.08}>
            {[
              ['01', 'Abstract syntax trees', 'Parse every file into dependency graphs.'],
              ['02', 'Pattern matching', 'Surface exposed keys and credentials.'],
              ['03', 'Path resolution', 'Trace client routes to server endpoints.'],
            ].map(([n, title, desc]) => (
              <RevealItem
                key={n}
                className="group flex items-start gap-5 border-t border-[var(--bp-line-faint)] py-4 first:border-t-0"
              >
                <span className="bp-mono mt-0.5 text-[11px] text-[var(--bp-line)]">{n}</span>
                <div>
                  <h4 className="text-[15px] font-semibold text-[var(--bp-ink)]">{title}</h4>
                  <p className="mt-0.5 text-[13px] text-[var(--bp-ink-dim)]">{desc}</p>
                </div>
                <span className="ml-auto h-px w-6 translate-y-2.5 bg-[var(--bp-line-faint)] transition-all duration-300 group-hover:w-10 group-hover:bg-[var(--bp-line)]" />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        <Reveal from="left" delay={0.1}>
          <LiveReadout />
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================ Metrics */
function Metrics() {
  const stats = [
    { value: '<30s', label: 'Time to insight' },
    { value: '0', label: 'Source files stored' },
    { value: '10+', label: 'Security scanners' },
    { value: '100%', label: 'Static analysis' },
  ];
  return (
    <section className="border-y border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_50%,transparent)]">
      <RevealGroup
        className="mx-auto grid max-w-[1320px] grid-cols-2 px-8 lg:grid-cols-4"
        stagger={0.1}
      >
        {stats.map((s, i) => (
          <RevealItem
            key={s.label}
            className={`relative px-6 py-11 ${i > 0 ? 'lg:border-l lg:border-[var(--bp-line-faint)]' : ''} ${i % 2 === 1 ? 'border-l border-[var(--bp-line-faint)] lg:border-l' : ''}`}
          >
            <div className="font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-semibold text-[var(--bp-ink)]">
              {s.value}
            </div>
            <div className="mt-2 bp-label">{s.label}</div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

/* ============================================================ How it works */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Paste a URL', desc: 'Any public GitHub repository. No install, no account.', icon: Link2 },
    { num: '02', title: 'Choose a lens', desc: 'Full map, security deep-dive, or onboarding synthesis.', icon: MapIcon },
    { num: '03', title: 'Explore', desc: 'Navigate the map, filter findings, export the report.', icon: ArrowUpRight },
  ];
  return (
    <section id="how-it-works" className="bp-paper relative py-24 md:py-28">
      <div className="mx-auto max-w-[1320px] px-8">
        <Reveal><p className="bp-label mb-4">FIG.03 — WORKFLOW</p></Reveal>
        <Reveal delay={0.05}>
          <h2 className="max-w-xl font-display text-[clamp(1.9rem,4vw,2.9rem)] font-semibold text-[var(--bp-ink)]">
            Frictionless from link to insight.
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-[var(--bp-line-faint)] bg-[var(--bp-line-faint)] md:grid-cols-3" stagger={0.1}>
          {steps.map((s) => (
            <RevealItem key={s.num}>
              <div className="group relative h-full bg-[var(--bp-ground)] p-8 transition-colors duration-300 hover:bg-[color-mix(in_oklab,var(--bp-ground-2)_70%,transparent)]">
                <span className="bp-reg opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ top: 8, left: 8 }} />
                <span className="bp-reg br opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ bottom: 8, right: 8 }} />
                <div className="flex items-center justify-between">
                  <span className="bp-mono text-[12px] text-[var(--bp-line)]">{s.num}</span>
                  <span className="grid h-9 w-9 place-items-center border border-[var(--bp-line-faint)] transition-colors duration-300 group-hover:border-[var(--bp-line)]">
                    <s.icon className="h-[18px] w-[18px] text-[var(--bp-line)]" strokeWidth={1.5} />
                  </span>
                </div>
                <h3 className="mt-14 text-[19px] font-semibold text-[var(--bp-ink)]">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--bp-ink-dim)]">{s.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ============================================================ Capabilities */
function BpCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`group relative h-full border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)] transition-colors duration-300 hover:border-[var(--bp-line-soft)] ${className}`}
    >
      <span className="bp-reg opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ top: 7, left: 7 }} />
      <span className="bp-reg tr opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ top: 7, right: 7 }} />
      <span className="bp-reg bl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ bottom: 7, left: 7 }} />
      <span className="bp-reg br opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ bottom: 7, right: 7 }} />
      {children}
    </div>
  );
}

function Features() {
  const items = [
    { icon: ShieldAlert, code: 'SEC', title: 'Vulnerability scan', desc: 'SQL injection, missing auth, and misconfigurations.' },
    { icon: Key, code: 'KEY', title: 'Secret detection', desc: 'Committed API keys and tokens, masked instantly.' },
    { icon: Link2, code: 'API', title: 'API dependency graph', desc: 'Client-server calls and broken links, traced.' },
    { icon: BookOpen, code: 'DOC', title: 'Onboarding docs', desc: 'Grounded start guides and architecture notes.' },
  ];
  return (
    <section id="features" className="relative border-t border-[var(--bp-line-faint)] py-24 md:py-28">
      <div className="mx-auto max-w-[1320px] px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal><p className="bp-label mb-4">FIG.04 — DETECTION SURFACE</p></Reveal>
            <Reveal delay={0.05}>
              <h2 className="max-w-xl font-display text-[clamp(1.9rem,4vw,2.9rem)] font-semibold text-[var(--bp-ink)]">
                One report. The whole surface area.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <Link href="/dashboard" className="group inline-flex items-center gap-2 bp-mono text-[12px] tracking-wide text-[var(--bp-ink-dim)] hover:text-[var(--bp-ink)]">
              Run your first scan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>

        <RevealGroup className="mt-12 grid auto-rows-[minmax(190px,auto)] grid-cols-1 gap-4 md:grid-cols-3" stagger={0.07}>
          {/* hero cell */}
          <RevealItem className="md:col-span-2 md:row-span-2">
            <BpCard className="flex flex-col justify-between overflow-hidden p-8">
              <div className="relative z-10 max-w-md">
                <div className="mb-6 inline-grid h-11 w-11 place-items-center border border-[var(--bp-line-soft)]">
                  <MapIcon className="h-5 w-5 text-[var(--bp-line)]" strokeWidth={1.5} />
                </div>
                <p className="bp-label mb-3">MAP</p>
                <h3 className="text-[24px] font-semibold text-[var(--bp-ink)]">Interactive code maps</h3>
                <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-[var(--bp-ink-dim)]">
                  Your codebase as a measured drawing. Trace component relationships, API routes, and data flows
                  at a glance — instead of reading thousands of lines.
                </p>
              </div>
              <DecoSchematic />
            </BpCard>
          </RevealItem>

          {items.map((f) => (
            <RevealItem key={f.title}>
              <BpCard className="flex flex-col p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center border border-[var(--bp-line-faint)] transition-colors duration-300 group-hover:border-[var(--bp-line)]">
                    <f.icon className="h-[18px] w-[18px] text-[var(--bp-line)]" strokeWidth={1.5} />
                  </span>
                  <span className="bp-label">{f.code}</span>
                </div>
                <h4 className="text-[16px] font-semibold text-[var(--bp-ink)]">{f.title}</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--bp-ink-dim)]">{f.desc}</p>
              </BpCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function DecoSchematic() {
  return (
    <div aria-hidden className="pointer-events-none absolute -right-4 -bottom-4 hidden h-52 w-72 opacity-70 sm:block">
      <svg viewBox="0 0 300 220" className="h-full w-full">
        {[[70, 70, 170, 120], [170, 120, 250, 70], [170, 120, 210, 190], [70, 70, 100, 175]].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--bp-line-soft)" strokeWidth="1" />
        ))}
        {[[170, 120, 6, 'var(--bp-line)'], [70, 70, 4, 'var(--bp-line)'], [250, 70, 4, 'var(--bp-line)'], [210, 190, 5, 'var(--bp-alert)'], [100, 175, 3.5, 'var(--bp-ink-dim)']].map(
          ([cx, cy, r, c], i) => (
            <g key={i}>
              <rect x={(cx as number) - (r as number)} y={(cy as number) - (r as number)} width={(r as number) * 2} height={(r as number) * 2} fill="none" stroke={c as string} strokeWidth="1" />
            </g>
          ),
        )}
      </svg>
    </div>
  );
}

/* ============================================================ Security */
function Security() {
  const cards = [
    { icon: FileCode, code: '01', title: 'No code execution', desc: 'We parse the AST statically. Your code is never run, compiled, or executed on our servers.' },
    { icon: Shield, code: '02', title: 'Secrets masked', desc: 'Any detected secret is masked (sk-live-••••) in memory before the report is ever rendered.' },
    { icon: Database, code: '03', title: 'Source never stored', desc: 'Only masked results, metadata, and summaries persist. Raw source and chunks are never saved.' },
  ];
  return (
    <section id="security" className="bp-paper relative border-t border-[var(--bp-line-faint)] py-24 md:py-28">
      <div className="mx-auto max-w-[1320px] px-8">
        <div className="max-w-2xl">
          <Reveal><p className="bp-label mb-4">FIG.05 — ZERO-TRUST</p></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-display text-[clamp(1.9rem,4vw,2.9rem)] font-semibold text-[var(--bp-ink)]">
              Built to protect your IP.
            </h2>
          </Reveal>
        </div>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3" stagger={0.09}>
          {cards.map((c) => (
            <RevealItem key={c.title}>
              <BpCard className="flex flex-col p-7">
                <div className="mb-6 flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center border border-[var(--bp-line-soft)]">
                    <c.icon className="h-5 w-5 text-[var(--bp-line)]" strokeWidth={1.5} />
                  </span>
                  <span className="bp-mono text-[11px] text-[var(--bp-line)]">{c.code}</span>
                </div>
                <h4 className="text-[16px] font-semibold text-[var(--bp-ink)]">{c.title}</h4>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--bp-ink-dim)]">{c.desc}</p>
              </BpCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ============================================================ CTA */
function CTA() {
  return (
    <section className="bp-paper relative overflow-hidden border-t border-[var(--bp-line-faint)] py-28">
      <span className="bp-reg" style={{ top: 24, left: 24 }} />
      <span className="bp-reg tr" style={{ top: 24, right: 24 }} />
      <div className="mx-auto max-w-[720px] px-8 text-center">
        <Reveal><p className="bp-label mb-5">READY</p></Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-display text-[clamp(2.2rem,5.5vw,3.6rem)] font-semibold text-[var(--bp-ink)]">
            Start analyzing.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-md text-[15.5px] text-[var(--bp-ink-dim)]">
            No account. No installation. Public repositories only.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mx-auto mt-9 max-w-lg text-left">
            <RepoInput />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================ Footer */
function Footer() {
  return (
    <footer className="border-t border-[var(--bp-line-faint)] py-10">
      <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-5 px-8 md:flex-row">
        <RepoRadarLogo size={26} wordClassName="text-[14px]" />
        <p className="bp-mono text-[11px] text-[var(--bp-ink-dim)]">
          © {new Date().getFullYear()} · STATIC ANALYSIS · SOURCE NEVER STORED
        </p>
        <div className="flex items-center gap-6 bp-label">
          <span>Privacy first</span>
          <span>Public repos only</span>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================ Page */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--bp-ground)] text-[var(--bp-ink)]">
      <Nav />
      <main>
        <Hero />
        <ProcessSection />
        <Metrics />
        <HowItWorks />
        <Features />
        <Security />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
