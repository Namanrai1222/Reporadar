'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, GitBranch, Shield, Map as MapIcon, BookOpen, Terminal,
  ShieldAlert, Key, Link2, FileCode, CheckCircle2, Database, ArrowUpRight,
} from 'lucide-react';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { BlueprintSchematic } from '@/components/landing/BlueprintSchematic';

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
            <LogoMark />
            <span className="bp-mono text-[14px] font-medium tracking-tight text-[var(--bp-ink)]">RepoRadar</span>
            <span className="bp-label hidden sm:inline">/ static analysis</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {['Features', 'How it works', 'Security'].map((item, i) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="bp-mono text-[12px] tracking-wide text-[var(--bp-ink-dim)] transition-colors hover:text-[var(--bp-ink)]"
              >
                <span className="text-[var(--bp-line)]">{String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp;{item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <Link
              href="/dashboard"
              className="bp-mono hidden text-[12px] tracking-wide text-[var(--bp-ink-dim)] transition-colors hover:text-[var(--bp-ink)] sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center gap-2 border border-[var(--bp-line)] px-4 py-2 bp-mono text-[12px] tracking-wide text-[var(--bp-ink)] transition-colors hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)]"
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

function LogoMark() {
  return (
    <span className="relative grid h-7 w-7 place-items-center">
      <svg viewBox="0 0 28 28" className="h-7 w-7" fill="none">
        <rect x="1" y="1" width="26" height="26" stroke="var(--bp-line)" strokeWidth="1" />
        <circle cx="14" cy="14" r="3" fill="var(--bp-ink)" />
        <circle cx="14" cy="14" r="8" stroke="var(--bp-line)" strokeWidth="1" opacity="0.6" />
        <line x1="14" y1="0" x2="14" y2="6" stroke="var(--bp-line)" strokeWidth="1" />
        <line x1="14" y1="22" x2="14" y2="28" stroke="var(--bp-line)" strokeWidth="1" />
        <line x1="0" y1="14" x2="6" y2="14" stroke="var(--bp-line)" strokeWidth="1" />
        <line x1="22" y1="14" x2="28" y2="14" stroke="var(--bp-line)" strokeWidth="1" />
      </svg>
    </span>
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
              <div className="bp-frame relative aspect-[68/47] w-full bg-[color-mix(in_oklab,var(--bp-ground-2)_60%,transparent)]">
                <span className="bp-reg" style={{ top: -1, left: -1 }} />
                <span className="bp-reg tr" style={{ top: -1, right: -1 }} />
                <span className="bp-reg bl" style={{ bottom: -1, left: -1 }} />
                <span className="bp-reg br" style={{ bottom: -1, right: -1 }} />
                <div className="absolute inset-0 p-3">
                  <BlueprintSchematic />
                </div>
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

/* ============================================================ Console */
const CONSOLE_LINES = [
  { text: 'Cloning repository metadata…', icon: Terminal, color: 'var(--text-muted)' },
  { text: 'Mapped 112 components · 47 API routes', icon: MapIcon, color: 'var(--signal)' },
  { text: 'CRITICAL — secret pattern in src/config.ts', icon: ShieldAlert, color: 'var(--critical)' },
  { text: '3 undocumented environment variables', icon: Key, color: 'var(--warning)' },
  { text: 'Report generated in 18.4s', icon: CheckCircle2, color: 'var(--success)' },
];

function LiveConsole() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % (CONSOLE_LINES.length + 1)), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass glass-edge overflow-hidden rounded-2xl shadow-[var(--shadow-lg)]">
      <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-600)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-600)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-600)]" />
        </div>
        <span className="font-mono text-[11px] text-[var(--text-faint)]">reporadar · engine</span>
        <span className="w-10" />
      </div>
      <div className="relative min-h-[236px] p-5 font-mono text-[13px] leading-relaxed">
        {CONSOLE_LINES.map((line, i) => {
          if (i > step) return null;
          const Icon = line.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mb-3 flex items-start gap-3"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: line.color }} />
              <span style={{ color: i === step ? 'var(--text-strong)' : line.color }} className="opacity-90">
                {line.text}
              </span>
            </motion.div>
          );
        })}
        {step < CONSOLE_LINES.length && (
          <div className="mt-2 flex items-center gap-2 text-[var(--text-faint)]">
            <span className="caret" /> analyzing AST…
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessSection() {
  return (
    <section className="relative border-t border-[var(--hairline)] py-28">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <Reveal><p className="eyebrow mb-5">Intelligence in motion</p></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[var(--text-strong)]">
              Ten scanners, one pass, <br className="hidden sm:block" />zero code executed.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[var(--text-muted)]">
              RepoRadar fetches the tree, resolves the architecture, and runs every scanner in parallel — purely
              statically. Secrets are masked in memory before a single pixel renders.
            </p>
          </Reveal>

          <RevealGroup className="mt-10 flex flex-col" stagger={0.08}>
            {[
              { title: 'Abstract syntax trees', desc: 'Parse every file into dependency graphs.' },
              { title: 'Pattern matching', desc: 'Surface exposed keys and credentials.' },
              { title: 'Path resolution', desc: 'Trace client routes to server endpoints.' },
            ].map((row) => (
              <RevealItem
                key={row.title}
                className="group flex items-baseline gap-5 border-t border-[var(--hairline)] py-4 first:border-t-0"
              >
                <span className="h-1.5 w-1.5 shrink-0 translate-y-1.5 rounded-full bg-[var(--signal)] transition-transform duration-300 group-hover:scale-150" />
                <div>
                  <h4 className="text-[15px] font-semibold text-[var(--text-strong)]">{row.title}</h4>
                  <p className="mt-0.5 text-[13.5px] text-[var(--text-muted)]">{row.desc}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        <Reveal from="left" delay={0.1}>
          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--signal)_18%,transparent),transparent_70%)] blur-2xl" />
            <LiveConsole />
          </div>
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
    <section className="border-y border-[var(--hairline)] bg-[color-mix(in_oklab,var(--surface)_40%,transparent)]">
      <RevealGroup
        className="mx-auto grid max-w-[1320px] grid-cols-2 divide-x divide-[var(--hairline)] px-6 lg:grid-cols-4"
        stagger={0.1}
      >
        {stats.map((s, i) => (
          <RevealItem key={s.label} className={`px-6 py-12 ${i % 2 === 1 ? 'pl-8' : ''}`}>
            <div className="font-display text-[clamp(2.4rem,4.5vw,3.6rem)] font-semibold text-[var(--text-strong)]">
              {s.value}
            </div>
            <div className="mt-2 text-[12px] uppercase tracking-[0.14em] text-[var(--text-faint)]">{s.label}</div>
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
    <section id="how-it-works" className="relative py-28">
      <div className="mx-auto max-w-[1320px] px-6">
        <Reveal><p className="eyebrow mb-4">How it works</p></Reveal>
        <Reveal delay={0.05}>
          <h2 className="max-w-xl font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[var(--text-strong)]">
            Frictionless from link to insight.
          </h2>
        </Reveal>

        <RevealGroup className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] md:grid-cols-3" stagger={0.1}>
          {steps.map((s) => (
            <RevealItem key={s.num}>
              <div className="group relative h-full bg-[var(--canvas)] p-8 transition-colors duration-300 hover:bg-[color-mix(in_oklab,var(--surface)_60%,transparent)]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13px] text-[var(--text-faint)]">{s.num}</span>
                  <s.icon className="h-5 w-5 text-[var(--signal)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-16 text-[20px] font-semibold text-[var(--text-strong)]">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">{s.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ============================================================ Features bento */
function Features() {
  return (
    <section id="features" className="relative border-t border-[var(--hairline)] py-28">
      <div className="mx-auto max-w-[1320px] px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal><p className="eyebrow mb-4">Everything detected</p></Reveal>
            <Reveal delay={0.05}>
              <h2 className="max-w-xl font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[var(--text-strong)]">
                One report. The whole surface area.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <Link href="/dashboard" className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-strong)]">
              Run your first scan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>

        <RevealGroup className="mt-12 grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-4 md:grid-cols-3" stagger={0.07}>
          {/* hero cell */}
          <RevealItem className="md:col-span-2 md:row-span-2">
            <SpotlightCard className="relative flex h-full flex-col justify-between overflow-hidden p-8">
              <div className="relative z-10 max-w-md">
                <div className="mb-6 inline-grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--signal)_14%,transparent)]">
                  <MapIcon className="h-5 w-5 text-[var(--signal)]" />
                </div>
                <h3 className="text-[26px] font-semibold text-[var(--text-strong)]">Interactive code maps</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-muted)]">
                  Your codebase as a living graph. Trace component relationships, API routes, and data flows at a
                  glance — instead of reading thousands of lines.
                </p>
              </div>
              <DecoNodes />
            </SpotlightCard>
          </RevealItem>

          {[
            { icon: ShieldAlert, color: 'var(--critical)', title: 'Vulnerability scan', desc: 'SQL injection, missing auth, and misconfigurations.' },
            { icon: Key, color: 'var(--warning)', title: 'Secret detection', desc: 'Committed API keys and tokens, masked instantly.' },
            { icon: Link2, color: 'var(--lumen)', title: 'API dependency graph', desc: 'Client-server calls and broken links, traced.' },
            { icon: BookOpen, color: 'var(--signal)', title: 'AI onboarding docs', desc: 'Grounded start guides and architecture notes.' },
          ].map((f) => (
            <RevealItem key={f.title}>
              <SpotlightCard tilt={false} className="flex h-full flex-col p-6">
                <div className="mb-4 inline-grid h-10 w-10 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${f.color} 14%, transparent)` }}>
                  <f.icon className="h-[18px] w-[18px]" style={{ color: f.color }} />
                </div>
                <h4 className="text-[16px] font-semibold text-[var(--text-strong)]">{f.title}</h4>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-muted)]">{f.desc}</p>
              </SpotlightCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function DecoNodes() {
  return (
    <div aria-hidden className="pointer-events-none absolute -right-6 -bottom-6 hidden h-56 w-72 sm:block">
      <svg viewBox="0 0 300 240" className="h-full w-full opacity-70">
        <defs>
          <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--signal)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--lumen)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <line x1="60" y1="60" x2="170" y2="120" stroke="url(#edge)" strokeWidth="1.5" />
        <line x1="170" y1="120" x2="250" y2="70" stroke="url(#edge)" strokeWidth="1.5" />
        <line x1="170" y1="120" x2="210" y2="200" stroke="url(#edge)" strokeWidth="1.5" />
        <line x1="60" y1="60" x2="90" y2="180" stroke="var(--hairline)" strokeWidth="1.5" />
        <circle cx="170" cy="120" r="7" fill="var(--signal)" />
        <circle cx="60" cy="60" r="4" fill="var(--lumen)" />
        <circle cx="250" cy="70" r="4" fill="var(--ink-400)" />
        <circle cx="210" cy="200" r="5" fill="var(--warning)" />
        <circle cx="90" cy="180" r="3.5" fill="var(--ink-400)" />
      </svg>
    </div>
  );
}

/* ============================================================ Security */
function Security() {
  const cards = [
    { icon: FileCode, title: 'No code execution', desc: 'We parse the AST statically. Your code is never run, compiled, or executed on our servers.' },
    { icon: Shield, title: 'Secrets masked', desc: 'Any detected secret is masked (sk-live-••••) in memory before the report is ever rendered.' },
    { icon: Database, title: 'Source never stored', desc: 'Only masked results, metadata, and summaries persist. Raw source and chunks are never saved.' },
  ];
  return (
    <section id="security" className="relative border-t border-[var(--hairline)] py-28">
      <div className="mx-auto max-w-[1320px] px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal><p className="eyebrow mb-4">Zero-trust architecture</p></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[var(--text-strong)]">
              Built to protect your IP.
            </h2>
          </Reveal>
        </div>

        <RevealGroup className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3" stagger={0.09}>
          {cards.map((c) => (
            <RevealItem key={c.title}>
              <div className="glass glass-edge flex h-full flex-col rounded-2xl p-8">
                <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-full border border-[var(--hairline)] bg-[color-mix(in_oklab,var(--surface)_60%,transparent)]">
                  <c.icon className="h-5 w-5 text-[var(--signal)]" />
                </div>
                <h4 className="text-[17px] font-semibold text-[var(--text-strong)]">{c.title}</h4>
                <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--text-muted)]">{c.desc}</p>
              </div>
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
    <section className="relative overflow-hidden py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[60vw] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--signal)_16%,transparent),transparent_60%)] blur-3xl" />
      </div>
      <div className="mx-auto max-w-[760px] px-6 text-center">
        <Reveal>
          <h2 className="font-display text-[clamp(2.4rem,5.5vw,4rem)] font-semibold text-[var(--text-strong)]">
            Start analyzing.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-5 max-w-md text-[16px] text-[var(--text-muted)]">
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
    <footer className="border-t border-[var(--hairline)] py-12">
      <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[14px] font-semibold tracking-tight text-[var(--text-strong)]">RepoRadar</span>
        </div>
        <p className="font-mono text-[12px] text-[var(--text-faint)]">
          © {new Date().getFullYear()} · Static analysis · Source never stored
        </p>
        <div className="flex items-center gap-6 text-[12px] text-[var(--text-faint)]">
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
    <div className="relative min-h-screen bg-[var(--canvas)] text-[var(--text-strong)]">
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
