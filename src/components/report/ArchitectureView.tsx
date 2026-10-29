'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import type { Finding, Report } from '@/lib/types';
import {
  LAYERS,
  ROLE_INFO,
  findingsByDir,
  type RepoStructure,
  type StructureDir,
} from '@/lib/structure';
import { LanguageBar, ROLE_TAG } from '@/components/report/ArchitectureMap';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';

/*
 * Architecture, explained as an exploded view (DL-070): the codebase's layers
 * start stacked and slide apart into place, each tagged "[01] INTERFACE" with
 * hairline leaders to its folders (DL-058). One loop moves: a request packet
 * travelling down the stack. Reading guide = index rows (DL-015); folder tree =
 * accordion where the open row expands (DL-022).
 */

const E_OUT = [0.16, 1, 0.3, 1] as const;
const CONNECTOR = [
  { label: 'calls into', dashed: false },
  { label: 'reads & writes', dashed: false },
  { label: 'checked & shipped by', dashed: true },
];

type LayerId = (typeof LAYERS)[number]['id'];

function layerOf(dir: StructureDir): LayerId {
  return LAYERS.find((l) => (l.roles as readonly string[]).includes(dir.role))!.id;
}

const hasHits = (hits?: Finding[]) => Boolean(hits && hits.length);
const files = (n: number) => `${n} file${n === 1 ? '' : 's'}`;

export function ArchitectureView({
  report,
  structure,
  partial,
  linkable,
}: {
  report: Report;
  structure: RepoStructure;
  partial: boolean;
  /** False for the seeded demo, whose repository does not exist on GitHub. */
  linkable: boolean;
}) {
  const reduce = useReducedMotion();
  const tops = useMemo(() => structure.dirs.filter((d) => d.depth === 1), [structure]);
  const flagged = useMemo(() => findingsByDir(report.findings), [report.findings]);
  const byLayer = useMemo(() => {
    const map = new Map<LayerId, StructureDir[]>(LAYERS.map((l) => [l.id, []]));
    for (const d of tops) map.get(layerOf(d))!.push(d);
    return map;
  }, [tops]);

  const where = LAYERS.filter((l) => l.id !== 'delivery' && byLayer.get(l.id)!.length > 0).map(
    (l) => `${l.label.toLowerCase()} in ${byLayer.get(l.id)!.slice(0, 2).map((d) => `${d.name}/`).join(' & ')}`,
  );

  return (
    <div className="space-y-10">
      {/* summary */}
      <Reveal from="none">
        <div className="flex flex-col gap-2 border-b border-[var(--bp-line-faint)] pb-5">
          <p className="bp-label">FIG.05 — Exploded view · how this codebase fits together</p>
          <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--bp-ink-dim)]">
            {report.repo.primaryLanguage ? `A ${report.repo.primaryLanguage} project` : 'A project'} with{' '}
            <span className="text-[var(--bp-ink)]">{structure.totalFiles} files</span>
            {where.length > 0 ? <>: {where.join('; ')}.</> : '.'}
          </p>
          {partial && (
            <p className="bp-mono text-[11px] text-[var(--bp-ink-dim)]">
              Saved before full-tree mapping — rescan to see every folder.
            </p>
          )}
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
        {/* ── exploded layer stack ── */}
        <div>
          {LAYERS.map((layer, i) => {
            const dirs = byLayer.get(layer.id)!;
            const isDelivery = layer.id === 'delivery';
            return (
              <div key={layer.id}>
                {i > 0 && <Connector index={i - 1} {...CONNECTOR[i - 1]} />}
                <motion.div
                  // assembled: every plate pulled up onto the first; exploded: its own row
                  initial={reduce ? false : { y: -i * 118, opacity: i === 0 ? 1 : 0.35 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true, margin: '-10% 0px' }}
                  transition={{ duration: 1.05, delay: 0.15 + i * 0.07, ease: E_OUT }}
                  style={{ zIndex: LAYERS.length - i }}
                  className="relative"
                >
                  <Plate dashed={isDelivery} empty={dirs.length === 0}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="w-[150px] shrink-0">
                        <p className="bp-mono text-[11px] tracking-[0.14em] text-[var(--bp-line)]">
                          [{String(i + 1).padStart(2, '0')}] {layer.label.toUpperCase()}
                        </p>
                        <p className="mt-1 text-[12px] leading-snug text-[var(--bp-ink-dim)]">{layer.explains}</p>
                      </div>
                      {/* hairline leader from the tag to the folders */}
                      <span aria-hidden className="mt-2 hidden h-px w-8 shrink-0 bg-[var(--bp-line-soft)] sm:block" />
                      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                        {dirs.length === 0 ? (
                          <span className="bp-mono text-[11px] text-[var(--bp-ink-dim)]">— none detected</span>
                        ) : (
                          dirs.map((d, k) => (
                            <motion.span
                              key={d.path}
                              initial={reduce ? false : { opacity: 0, y: 6 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.5, delay: 0.75 + i * 0.07 + k * 0.04, ease: E_OUT }}
                              title={ROLE_INFO[d.role].explains}
                              className="inline-flex items-center gap-1.5 border px-2 py-1 bp-mono text-[11.5px]"
                              style={{
                                borderColor: hasHits(flagged.get(d.path))
                                  ? 'color-mix(in oklab, var(--bp-alert) 55%, transparent)'
                                  : 'var(--bp-line-faint)',
                                background: 'color-mix(in oklab, var(--bp-ground) 70%, transparent)',
                              }}
                            >
                              <span className="text-[9px] text-[var(--bp-line)]">{ROLE_TAG[d.role]}</span>
                              <span className="text-[var(--bp-ink)]">{d.name}/</span>
                              <span className="text-[var(--bp-ink-dim)]">{d.files}</span>
                              {hasHits(flagged.get(d.path)) && (
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--bp-alert)]" aria-label="has findings" />
                              )}
                            </motion.span>
                          ))
                        )}
                      </div>
                    </div>
                  </Plate>
                </motion.div>
              </div>
            );
          })}
          <p className="mt-4 bp-mono text-[10.5px] text-[var(--bp-ink-dim)]">
            Fig. 05 — layers inferred from folder names; amber outline = folder has findings.
          </p>
        </div>

        {/* ── where to start ── */}
        <aside className="space-y-8">
          <ReadingGuide structure={structure} githubBase={linkable ? `${report.repo.url}/tree/${encodeURIComponent(report.repo.branch)}` : null} />
          <div>
            <p className="bp-label mb-3">Built with</p>
            {report.stack.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {report.stack.map((s) => (
                  <span key={s} className="border border-[var(--bp-line-faint)] px-2 py-0.5 bp-mono text-[11px] text-[var(--bp-ink)]">
                    {s}
                  </span>
                ))}
              </div>
            )}
            <LanguageBar languages={structure.languages} total={structure.totalFiles} />
          </div>
        </aside>
      </div>

      <FolderTree structure={structure} flagged={flagged} />
    </div>
  );
}

/** A layer plate: an engineering-drawing parallelogram with upright content. */
function Plate({ children, dashed, empty }: { children: React.ReactNode; dashed: boolean; empty: boolean }) {
  return (
    <div className={`relative px-6 py-5 sm:px-10 ${empty ? 'opacity-50' : ''}`}>
      <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polygon
          points="3,0 100,0 97,100 0,100"
          fill="color-mix(in oklab, var(--bp-ground-2) 92%, var(--bp-line))"
          stroke="var(--bp-line-soft)"
          strokeDasharray={dashed ? '4 4' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

function Connector({ index, label, dashed }: { index: number; label: string; dashed: boolean }) {
  const reduce = useReducedMotion();
  return (
    // appears once the plates have exploded apart, so it never floats in an empty gap
    <motion.div
      aria-hidden
      initial={reduce ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.95 + index * 0.07 }}
      className="relative flex h-11 items-center justify-center gap-10"
    >
      {[0, 1, 2].map((k) => (
        <span
          key={k}
          className="relative h-full w-px"
          style={{
            background: dashed
              ? 'repeating-linear-gradient(to bottom, var(--bp-line-soft) 0 3px, transparent 3px 7px)'
              : 'var(--bp-line-soft)',
          }}
        >
          {/* the packet: middle line only, offset per connector so it reads as one trip down */}
          {k === 1 && !dashed && <span className="rr-flow-dot" style={{ animationDelay: `${index * 1.2}s` }} />}
        </span>
      ))}
      <span className="absolute left-[calc(50%+56px)] bp-mono text-[10px] text-[var(--bp-ink-dim)]">{label}</span>
    </motion.div>
  );
}

function ReadingGuide({ structure, githubBase }: { structure: RepoStructure; githubBase: string | null }) {
  const first = (kind: string) => structure.keyFiles.find((f) => f.kind === kind)?.path;
  const logic = structure.dirs.find((d) => d.depth === 1 && ['source', 'lib', 'api', 'app'].includes(d.role));
  const tests = structure.dirs.find((d) => d.depth === 1 && d.role === 'tests');
  const ship = first('ci') ?? first('container');
  const steps = [
    first('docs') && { title: 'What the project is', path: first('docs')! },
    first('manifest') && { title: 'What it depends on', path: first('manifest')! },
    first('entry') && { title: 'Where it starts running', path: first('entry')! },
    logic && { title: 'Where most of the code lives', path: `${logic.path}/` },
    tests && { title: 'How it is checked', path: `${tests.path}/` },
    ship && { title: 'How it ships', path: ship },
  ].filter(Boolean) as { title: string; path: string }[];

  if (steps.length === 0) return null;
  return (
    <div>
      <p className="bp-label mb-3">Where to start reading</p>
      <RevealGroup as="div" className="border-t border-[var(--bp-line-faint)]" stagger={0.07}>
        {steps.map((s, i) => (
          <RevealItem key={s.title}>
            {(() => {
              const body = (
                <>
                  <span className="bp-mono text-[11px] text-[var(--bp-line)]">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-[var(--bp-ink)]">{s.title}</span>
                    <span className="block break-all bp-mono text-[11px] text-[var(--bp-ink-dim)]">{s.path}</span>
                  </span>
                </>
              );
              const row = 'group flex items-center gap-4 border-b border-[var(--bp-line-faint)] px-1 py-3';
              return githubBase ? (
                <a
                  href={`${githubBase}/${s.path.replace(/\/$/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.title}: open ${s.path} on GitHub`}
                  className={`${row} transition-colors hover:bg-[color-mix(in_oklab,var(--bp-line)_7%,transparent)] focus-visible:bg-[color-mix(in_oklab,var(--bp-line)_9%,transparent)] focus-visible:outline-none`}
                >
                  {body}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-[var(--bp-ink-dim)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--bp-line)]"
                    strokeWidth={1.5}
                  />
                </a>
              ) : (
                <div className={row}>{body}</div>
              );
            })()}
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}

function FolderTree({ structure, flagged }: { structure: RepoStructure; flagged: Map<string, Finding[]> }) {
  const reduce = useReducedMotion();
  const tops = structure.dirs.filter((d) => d.depth === 1);
  const [open, setOpen] = useState<string | null>(tops[0]?.path ?? null);
  const max = Math.max(1, ...tops.map((d) => d.files));

  if (tops.length === 0) return null;
  return (
    <section>
      <p className="bp-label mb-3">Folder breakdown</p>
      <div className="border-t border-[var(--bp-line-faint)]">
        {tops.map((d, i) => {
          const isOpen = open === d.path;
          const kids = structure.dirs.filter((c) => c.depth === 2 && c.path.startsWith(`${d.path}/`));
          const hits = flagged.get(d.path)?.length ?? 0;
          return (
            <div key={d.path} className="border-b border-[var(--bp-line-faint)]">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : d.path)}
                className={`grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 text-left transition-colors focus-visible:outline-none sm:grid-cols-[36px_minmax(0,200px)_1fr_auto] ${
                  isOpen ? 'bg-[color-mix(in_oklab,var(--bp-line)_8%,transparent)]' : 'hover:bg-[color-mix(in_oklab,var(--bp-line)_5%,transparent)] focus-visible:bg-[color-mix(in_oklab,var(--bp-line)_8%,transparent)]'
                }`}
              >
                <span className="bp-mono text-[10px] text-[var(--bp-line)]">{ROLE_TAG[d.role]}</span>
                <span className="truncate bp-mono text-[13px] text-[var(--bp-ink)]">{d.name}/</span>
                {/* share-of-repo bar, grows in once */}
                <span className="hidden h-1 bg-[var(--bp-line-ghost)] sm:block">
                  <motion.span
                    className="block h-full origin-left bg-[var(--bp-line)]"
                    style={{ width: `${(d.files / max) * 100}%` }}
                    initial={reduce ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: i * 0.05, ease: E_OUT }}
                  />
                </span>
                <span className="flex items-center gap-3 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
                  {hits > 0 && <span className="text-[var(--bp-alert)]">{hits} finding{hits > 1 ? 's' : ''}</span>}
                  <span>{files(d.files)}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--bp-line)]' : ''}`}
                    strokeWidth={1.5}
                  />
                </span>
              </button>
              <motion.div
                initial={false}
                animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: E_OUT }}
                className="overflow-hidden"
              >
                <div className="space-y-2 px-1 pb-4 pl-[52px] pt-1">
                  <p className="max-w-xl text-[12.5px] leading-relaxed text-[var(--bp-ink-dim)]">
                    <span className="text-[var(--bp-ink)]">{ROLE_INFO[d.role].label}.</span> {ROLE_INFO[d.role].explains}
                    {d.languages.length > 0 && <> Mostly {d.languages.map((l) => l.name).join(', ')}.</>}
                  </p>
                  {kids.length > 0 && (
                    <ul className="space-y-1">
                      {kids.map((c) => (
                        <li key={c.path} className="flex items-baseline gap-2 bp-mono text-[11.5px]">
                          <span className="text-[var(--bp-line-soft)]">└─</span>
                          <span className="text-[var(--bp-ink)]">{c.name}/</span>
                          <span className="text-[var(--bp-ink-dim)]">{files(c.files)}</span>
                          {(flagged.get(c.path)?.length ?? 0) > 0 && (
                            <span className="text-[var(--bp-alert)]">· {flagged.get(c.path)!.length} findings</span>
                          )}
                        </li>
                      ))}
                      {d.hiddenChildren > 0 && (
                        <li className="bp-mono text-[11px] text-[var(--bp-ink-dim)]">└─ + {d.hiddenChildren} more</li>
                      )}
                    </ul>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
      {structure.hiddenDirs > 0 && (
        <p className="mt-2 bp-mono text-[10.5px] text-[var(--bp-ink-dim)]">+ {structure.hiddenDirs} smaller folders</p>
      )}
    </section>
  );
}
