'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileCode, FolderTree } from 'lucide-react';
import type { Finding, Report, Severity } from '@/lib/types';
import {
  KEY_FILE_LABEL,
  ROLE_INFO,
  findingsByDir,
  type DirRole,
  type KeyFileKind,
  type RepoStructure,
  type StructureDir,
} from '@/lib/structure';
import { SeverityBadge } from '@/components/ui/SeverityBadge';

/*
 * "Repo radar": the repository drawn as a radar plot. Hub = repo, inner ring =
 * top-level folders, outer ring = their subfolders. One thing moves — the sweep;
 * folders with findings ping as it passes them. Reduced motion: all static.
 */

const SWEEP_SECONDS = 9;
const CHAR_W = 0.6; // JetBrains Mono advance per px of font size
const E_OUT = 'cubic-bezier(.16,1,.3,1)';

export const ROLE_TAG: Record<DirRole, string> = {
  source: 'SRC', app: 'APP', api: 'API', components: 'UI', lib: 'LIB', database: 'DB',
  tests: 'TST', docs: 'DOC', config: 'CFG', ci: 'CI', assets: 'AST', data: 'DAT',
  notebooks: 'NB', models: 'MDL', scripts: 'SCR', infra: 'INF', other: 'DIR',
};

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const SEVERITY_COLOR: Partial<Record<Severity, string>> = {
  critical: 'var(--bp-critical)',
  high: 'var(--bp-alert)',
  medium: 'var(--bp-alert)',
};

interface Placed {
  dir: StructureDir;
  angle: number; // radians, clockwise from 12 o'clock
  x: number;
  y: number;
  r: number;
  parent?: Placed;
}

const polar = (angle: number, radius: number) => ({ x: Math.sin(angle) * radius, y: -Math.cos(angle) * radius });
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function layout(structure: RepoStructure, w: number, h: number) {
  const compact = w < 560;
  // Outer labels are drawn along their spoke, so they need radial room, not width.
  const labelRoom = compact ? 18 : 118;
  const bezel = Math.min(w, h) / 2 - 6;
  const r2 = Math.max(90, bezel - labelRoom);
  const r1 = r2 * 0.6;
  const hub = Math.min(42, r1 * 0.32);

  const tops = structure.dirs.filter((d) => d.depth === 1);
  const childrenOf = (p: string) => structure.dirs.filter((d) => d.depth === 2 && d.path.startsWith(`${p}/`));
  // Equal sectors: weighting by child count crowded leaf folders onto one side.
  const span = (Math.PI * 2) / Math.max(tops.length, 1);
  // Inner circles may not exceed ~40% of the gap to their neighbour.
  const innerMax = Math.max(10, Math.min(compact ? 17 : 21, r1 * Math.sin(span / 2) * 0.8));
  const maxFiles = Math.max(1, ...structure.dirs.map((d) => d.files));
  const size = (files: number, min: number, max: number) => min + (max - min) * Math.sqrt(files / maxFiles);

  const nodes: Placed[] = [];
  let cursor = 0;
  tops.forEach((top) => {
    const angle = cursor + span / 2;
    const parent: Placed = { dir: top, angle, ...polar(angle, r1), r: size(top.files, Math.min(11, innerMax), innerMax) };
    nodes.push(parent);
    const kids = childrenOf(top.path);
    kids.forEach((kid, k) => {
      const a = cursor + (span * (k + 0.5)) / kids.length;
      nodes.push({ dir: kid, angle: a, ...polar(a, r2), r: size(kid.files, 4.5, 8), parent });
    });
    cursor += span;
  });

  return { nodes, r1, r2, hub, bezel, compact };
}

const worst = (list: Finding[] = []) => SEVERITY_ORDER.find((s) => list.some((f) => f.severity === s));

export function ArchitectureMap({
  report,
  structure,
  partial,
}: {
  report: Report;
  structure: RepoStructure;
  /** Built from flagged files only (report predates full-tree capture). */
  partial: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 560 });
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize({ w: Math.round(width), h: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { nodes, r1, r2, hub, bezel, compact } = useMemo(() => layout(structure, size.w, size.h), [structure, size]);
  const flagged = useMemo(() => findingsByDir(report.findings), [report.findings]);
  const byPath = useMemo(() => new Map(nodes.map((n) => [n.dir.path, n])), [nodes]);

  // Lineage of the focused folder (itself + parent + children) stays lit; the rest dims.
  const focus = hovered ?? selected;
  const lit = (path: string) => {
    if (!focus) return true;
    return path === focus || focus.startsWith(`${path}/`) || path.startsWith(`${focus}/`);
  };

  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const repoName = `${report.repo.owner}/${report.repo.name}`;
  const current = selected ? byPath.get(selected)?.dir ?? null : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* ── radar ── */}
      <div className="relative flex min-h-[420px] flex-1 flex-col">
        <div ref={box} className="bp-paper relative min-h-0 flex-1 overflow-hidden">
          {/* steel-blue bloom behind the hub (DL-045's quiet glow) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--bp-line) 14%, transparent), transparent 55%)' }}
          />
          <svg
            viewBox={`${-size.w / 2} ${-size.h / 2} ${size.w} ${size.h}`}
            className="relative h-full w-full"
            role="group"
            aria-label={`Architecture map of ${repoName}`}
            onClick={(e) => e.target === e.currentTarget && setSelected(null)}
          >
            {/* bezel: rings and degree ticks */}
            <g fill="none" stroke="var(--bp-line-faint)">
              <circle r={bezel} />
              <circle r={r2} strokeDasharray="2 5" />
              <circle r={r1} strokeDasharray="2 5" />
              <circle r={hub + 10} stroke="var(--bp-line-ghost)" />
            </g>
            <g stroke="var(--bp-line-soft)">
              {ticks.map((deg) => {
                const a = (deg * Math.PI) / 180;
                const outer = polar(a, bezel);
                const inner = polar(a, bezel - (deg % 30 === 0 ? 9 : 4));
                return <line key={deg} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} strokeOpacity={deg % 30 === 0 ? 0.9 : 0.4} />;
              })}
            </g>
            {!compact &&
              [0, 90, 180, 270].map((deg) => {
                const p = polar((deg * Math.PI) / 180, bezel - 20);
                return (
                  <text key={deg} x={p.x} y={p.y + 3} textAnchor="middle" className="bp-mono" fontSize="9" fill="var(--bp-ink-dim)">
                    {String(deg).padStart(3, '0')}
                  </text>
                );
              })}

            {/* the one moving thing */}
            <g className="radar-sweep" style={{ animationDuration: `${SWEEP_SECONDS}s` }} aria-hidden>
              <circle r={bezel} fill="none" stroke="none" />
              {/* trailing wedge behind the clockwise leading edge */}
              <path
                d={`M0 0 L${polar(-0.55, bezel).x} ${polar(-0.55, bezel).y} A${bezel} ${bezel} 0 0 1 0 ${-bezel} Z`}
                fill="var(--bp-line)"
                fillOpacity="0.07"
              />
              <line x1="0" y1="0" x2="0" y2={-bezel} stroke="var(--bp-line)" strokeOpacity="0.55" />
            </g>

            {/* spokes: hub → folder → subfolder, drawn in once */}
            <g fill="none">
              {nodes.map((n, i) => {
                let d: string;
                if (n.parent) {
                  // bends out of the parent's spoke, so siblings fan like a tree
                  const ctrl = polar(n.parent.angle, (r1 + r2) / 2);
                  d = `M${n.parent.x} ${n.parent.y} Q${ctrl.x} ${ctrl.y} ${n.x} ${n.y}`;
                } else {
                  const edge = polar(n.angle, hub);
                  d = `M${edge.x} ${edge.y} L${n.x} ${n.y}`;
                }
                return (
                  <path
                    key={n.dir.path}
                    d={d}
                    pathLength={1}
                    className="bp-draw"
                    stroke={flagged.has(n.dir.path) ? SEVERITY_COLOR[worst(flagged.get(n.dir.path))!] ?? 'var(--bp-line-soft)' : 'var(--bp-line-soft)'}
                    strokeOpacity={lit(n.dir.path) ? 0.7 : 0.12}
                    strokeWidth={n.parent ? 1 : 1.25}
                    style={{ ['--len' as string]: 1, animationDelay: `${Math.min(i * 0.03, 0.6)}s`, animationDuration: '0.8s', transition: 'stroke-opacity .3s' }}
                  />
                );
              })}
            </g>

            {/* hub */}
            <g className="cursor-pointer" onClick={() => setSelected(null)}>
              <circle r={hub} fill="var(--bp-ground-2)" stroke="var(--bp-line)" strokeWidth="1.25" />
              <text y={-3} textAnchor="middle" className="bp-mono" fontSize={compact ? 9 : 10.5} fill="var(--bp-ink)">
                {clip(report.repo.name, Math.max(4, Math.floor((hub * 1.7) / ((compact ? 9 : 10.5) * CHAR_W))))}
              </text>
              <text y={11} textAnchor="middle" className="bp-mono" fontSize="8.5" fill="var(--bp-line)">
                {structure.totalFiles} FILES
              </text>
            </g>

            {/* folders */}
            {nodes.map((n, i) => {
              const hits = flagged.get(n.dir.path);
              const sev = worst(hits);
              const color = sev ? SEVERITY_COLOR[sev] ?? 'var(--bp-line)' : 'var(--bp-line)';
              const isSel = selected === n.dir.path;
              const on = lit(n.dir.path);
              const inner = n.dir.depth === 1;
              // Outer labels run along their spoke; flipped on the left half so they stay upright.
              const deg = (n.angle * 180) / Math.PI;
              const leftHalf = n.angle > Math.PI;
              const labelPos = polar(n.angle, r2 + n.r + 7);
              const innerLabel = polar(n.angle, r1 + n.r + 9);
              const anchorInner = Math.abs(Math.sin(n.angle)) < 0.35 ? 'middle' : Math.sin(n.angle) > 0 ? 'start' : 'end';
              const innerText = clip(n.dir.name, compact ? 8 : 11);
              const fs = inner ? 11 : 10;
              return (
                <g
                  key={n.dir.path}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.dir.path}: ${ROLE_INFO[n.dir.role].label}, ${n.dir.files} files${hits ? `, ${hits.length} findings` : ''}`}
                  aria-pressed={isSel}
                  className="cursor-pointer outline-none"
                  style={{ opacity: on ? 1 : 0.28, transition: 'opacity .3s' }}
                  onClick={() => setSelected(isSel ? null : n.dir.path)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(isSel ? null : n.dir.path);
                    }
                  }}
                  onMouseEnter={() => setHovered(n.dir.path)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(n.dir.path)}
                  onBlur={() => setHovered(null)}
                >
                  <title>{`${n.dir.path} — ${n.dir.files} files`}</title>
                  <g style={{ animation: `bp-fade .5s ${E_OUT} both`, animationDelay: `${0.2 + Math.min(i * 0.03, 0.6)}s` }}>
                    {sev && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r}
                        fill="none"
                        stroke={color}
                        className="rr-ping"
                        // fires as the sweep's leading edge crosses this folder
                        style={{ ['--period' as string]: `${SWEEP_SECONDS}s`, animationDelay: `${(n.angle / (Math.PI * 2)) * SWEEP_SECONDS}s` }}
                      />
                    )}
                    {isSel && <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke="var(--bp-line)" strokeOpacity="0.5" />}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r}
                      fill={inner ? 'var(--bp-ground-2)' : sev ? color : 'var(--bp-line)'}
                      fillOpacity={inner ? 1 : sev ? 0.9 : 0.75}
                      stroke={color}
                      strokeWidth={isSel ? 2 : 1.25}
                      style={isSel ? { filter: 'drop-shadow(0 0 8px color-mix(in oklab, var(--bp-line) 70%, transparent))' } : undefined}
                    />
                    {inner && (
                      <text x={n.x} y={n.y + 3} textAnchor="middle" className="bp-mono" fontSize="8.5" fill={color}>
                        {ROLE_TAG[n.dir.role]}
                      </text>
                    )}
                    {inner ? (
                      <g>
                        <rect
                          x={innerLabel.x - (anchorInner === 'start' ? 3 : anchorInner === 'end' ? innerText.length * fs * CHAR_W + 3 : (innerText.length * fs * CHAR_W) / 2 + 3)}
                          y={innerLabel.y - fs * 0.85}
                          width={innerText.length * fs * CHAR_W + 6}
                          height={fs * 1.3}
                          fill="var(--bp-ground)"
                          fillOpacity="0.85"
                        />
                        <text x={innerLabel.x} y={innerLabel.y} textAnchor={anchorInner} className="bp-mono" fontSize={fs} fill="var(--bp-ink)">
                          {innerText}
                        </text>
                      </g>
                    ) : (
                      !compact && (
                        <text
                          transform={`translate(${labelPos.x} ${labelPos.y}) rotate(${leftHalf ? deg + 90 : deg - 90})`}
                          textAnchor={leftHalf ? 'end' : 'start'}
                          dy="3"
                          className="bp-mono"
                          fontSize={fs}
                          fill="var(--bp-ink-dim)"
                        >
                          {clip(n.dir.name, 16)}
                          <tspan fill="var(--bp-line)" fillOpacity="0.8">{`  ${n.dir.files}`}</tspan>
                        </text>
                      )
                    )}
                  </g>
                </g>
              );
            })}
          </svg>

          {nodes.length === 0 && (
            <p className="absolute inset-x-0 bottom-10 text-center bp-mono text-[11px] text-[var(--bp-ink-dim)]">
              Every file sits at the repository root — no folders to map.
            </p>
          )}
        </div>

        {/* key, under the figure */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] px-4 py-2.5 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
          <span className="bp-label">Key</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--bp-line)]" /> folder
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--bp-line)] opacity-75" /> subfolder
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--bp-alert)]" /> has findings
          </span>
          <span className="ml-auto hidden sm:inline">
            {compact ? 'Tap a folder for details' : 'Hover to trace · click or Tab for details'}
          </span>
        </div>
      </div>

      {/* ── explainer ── */}
      <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-t border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] lg:w-[340px] lg:border-l lg:border-t-0">
        {current ? (
          <FolderDetail dir={current} structure={structure} findings={flagged.get(current.path) ?? []} reportId={report.id} onBack={() => setSelected(null)} onPick={setSelected} />
        ) : (
          <RepoOverview report={report} structure={structure} partial={partial} flagged={flagged} onPick={setSelected} />
        )}
      </aside>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--bp-line-faint)] px-5 py-4">
      <p className="bp-label mb-2.5">{label}</p>
      {children}
    </div>
  );
}

export function LanguageBar({ languages, total }: { languages: { name: string; files: number }[]; total: number }) {
  if (languages.length === 0) return <p className="bp-mono text-[11px] text-[var(--bp-ink-dim)]">No recognised source languages.</p>;
  const sum = languages.reduce((a, l) => a + l.files, 0);
  return (
    <>
      <div className="flex h-1.5 w-full overflow-hidden bg-[var(--bp-line-ghost)]">
        {languages.map((l, i) => (
          <span
            key={l.name}
            title={`${l.name}: ${l.files}`}
            style={{ width: `${(l.files / sum) * 100}%`, background: 'var(--bp-line)', opacity: 1 - i * 0.14 }}
          />
        ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 bp-mono text-[11px]">
        {languages.map((l) => (
          <li key={l.name} className="flex justify-between gap-2 text-[var(--bp-ink-dim)]">
            <span className="truncate text-[var(--bp-ink)]">{l.name}</span>
            <span>{Math.round((l.files / Math.max(total, 1)) * 100)}%</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function RepoOverview({
  report,
  structure,
  partial,
  flagged,
  onPick,
}: {
  report: Report;
  structure: RepoStructure;
  partial: boolean;
  flagged: Map<string, Finding[]>;
  onPick: (path: string) => void;
}) {
  const tops = structure.dirs.filter((d) => d.depth === 1);
  const groups = new Map<KeyFileKind, string[]>();
  for (const f of structure.keyFiles) groups.set(f.kind, [...(groups.get(f.kind) ?? []), f.path]);
  const kindOrder: KeyFileKind[] = ['entry', 'manifest', 'config', 'container', 'ci', 'env', 'docs'];

  return (
    <>
      <div className="border-b border-[var(--bp-line-faint)] px-5 py-4">
        <p className="bp-label mb-1 flex items-center gap-1.5">
          <FolderTree className="h-3.5 w-3.5" strokeWidth={1.5} /> How this repo is set up
        </p>
        <p className="text-[13px] leading-relaxed text-[var(--bp-ink-dim)]">
          <span className="text-[var(--bp-ink)]">{structure.totalFiles}</span> files across{' '}
          <span className="text-[var(--bp-ink)]">{tops.length + structure.hiddenDirs}</span> top-level folders
          {structure.rootFiles > 0 && <> and {structure.rootFiles} at the root</>}
          {report.stack.length > 0 && <>, built with {report.stack.join(', ')}</>}.
        </p>
        {report.findings.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 bp-mono text-[11px] text-[var(--bp-line)]">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} /> No issues found — this is the full layout.
          </p>
        ) : (
          <p className="mt-3 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
            {flagged.size > 0 ? `${[...flagged.keys()].filter((k) => !k.includes('/')).length} folder(s) carry findings — they ping as the sweep passes.` : `${report.findings.length} finding(s), all in root files.`}
          </p>
        )}
        {partial && (
          <p className="mt-3 border border-[var(--bp-line-faint)] px-3 py-2 bp-mono text-[10.5px] leading-relaxed text-[var(--bp-ink-dim)]">
            This report was saved before full-tree mapping. Rescan the repository to map every folder.
          </p>
        )}
      </div>

      <Section label="Languages">
        <LanguageBar languages={structure.languages} total={structure.totalFiles} />
      </Section>

      {structure.keyFiles.length > 0 && (
        <Section label="Key files">
          <dl className="space-y-2.5">
            {kindOrder
              .filter((k) => groups.has(k))
              .map((k) => (
                <div key={k}>
                  <dt className="bp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bp-line)]">{KEY_FILE_LABEL[k]}</dt>
                  {groups.get(k)!.slice(0, 4).map((p) => (
                    <dd key={p} className="mt-0.5 flex items-center gap-1.5 break-all bp-mono text-[11.5px] text-[var(--bp-ink)]">
                      <FileCode className="h-3 w-3 shrink-0 text-[var(--bp-ink-dim)]" strokeWidth={1.5} />
                      {p}
                    </dd>
                  ))}
                </div>
              ))}
          </dl>
        </Section>
      )}

      <Section label="Folders">
        <ul className="space-y-1">
          {tops.map((d) => (
            <li key={d.path}>
              <button
                type="button"
                onClick={() => onPick(d.path)}
                className="group flex w-full items-start gap-3 px-2 py-1.5 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--bp-line)_7%,transparent)] focus-visible:bg-[color-mix(in_oklab,var(--bp-line)_9%,transparent)] focus-visible:outline-none"
              >
                <span className="mt-0.5 w-8 shrink-0 bp-mono text-[9.5px] text-[var(--bp-line)]">{ROLE_TAG[d.role]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate bp-mono text-[12px] text-[var(--bp-ink)]">{d.name}/</span>
                    <span className="shrink-0 bp-mono text-[10.5px] text-[var(--bp-ink-dim)]">{d.files}</span>
                  </span>
                  <span className="block text-[11.5px] leading-snug text-[var(--bp-ink-dim)]">{ROLE_INFO[d.role].explains}</span>
                </span>
              </button>
            </li>
          ))}
          {structure.hiddenDirs > 0 && (
            <li className="px-2 pt-1 bp-mono text-[10.5px] text-[var(--bp-ink-dim)]">+ {structure.hiddenDirs} smaller folders not drawn</li>
          )}
        </ul>
      </Section>
    </>
  );
}

function FolderDetail({
  dir,
  structure,
  findings,
  reportId,
  onBack,
  onPick,
}: {
  dir: StructureDir;
  structure: RepoStructure;
  findings: Finding[];
  reportId: string;
  onBack: () => void;
  onPick: (path: string) => void;
}) {
  const children = structure.dirs.filter((d) => d.depth === 2 && d.path.startsWith(`${dir.path}/`));
  const parent = dir.depth === 2 ? structure.dirs.find((d) => d.path === dir.path.split('/')[0]) : undefined;

  return (
    <>
      <div className="border-b border-[var(--bp-line-faint)] px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 bp-mono text-[11px] text-[var(--bp-ink-dim)] transition-colors hover:text-[var(--bp-ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Repo overview
        </button>
        <p className="bp-label mb-1">[{ROLE_TAG[dir.role]}] {ROLE_INFO[dir.role].label}</p>
        <p className="break-all bp-mono text-[15px] text-[var(--bp-ink)]">{dir.path}/</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--bp-ink-dim)]">{ROLE_INFO[dir.role].explains}</p>
        <div className="mt-3 grid grid-cols-2 border border-[var(--bp-line-faint)] bp-mono">
          <div className="border-r border-[var(--bp-line-faint)] px-3 py-2">
            <div className="text-[9px] tracking-[0.16em] text-[var(--bp-line)]">FILES</div>
            <div className="text-[15px] text-[var(--bp-ink)]">{dir.files}</div>
          </div>
          <div className="px-3 py-2">
            <div className="text-[9px] tracking-[0.16em] text-[var(--bp-line)]">FINDINGS</div>
            <div className="text-[15px]" style={{ color: findings.length ? 'var(--bp-alert)' : 'var(--bp-ink)' }}>{findings.length}</div>
          </div>
        </div>
      </div>

      {dir.languages.length > 0 && (
        <Section label="Languages here">
          <LanguageBar languages={dir.languages} total={dir.files} />
        </Section>
      )}

      {(children.length > 0 || parent) && (
        <Section label={parent ? 'Inside' : 'Subfolders'}>
          <ul className="space-y-1">
            {(parent ? [parent] : children).map((d) => (
              <li key={d.path}>
                <button
                  type="button"
                  onClick={() => onPick(d.path)}
                  className="flex w-full items-baseline justify-between gap-2 px-2 py-1 text-left bp-mono text-[12px] text-[var(--bp-ink)] transition-colors hover:bg-[color-mix(in_oklab,var(--bp-line)_7%,transparent)] focus-visible:outline-none focus-visible:bg-[color-mix(in_oklab,var(--bp-line)_9%,transparent)]"
                >
                  <span className="truncate">{parent ? '↑ ' : ''}{d.path}/</span>
                  <span className="shrink-0 text-[10.5px] text-[var(--bp-ink-dim)]">{d.files}</span>
                </button>
              </li>
            ))}
            {!parent && dir.hiddenChildren > 0 && (
              <li className="px-2 bp-mono text-[10.5px] text-[var(--bp-ink-dim)]">+ {dir.hiddenChildren} more</li>
            )}
          </ul>
        </Section>
      )}

      <Section label="Findings in this folder">
        {findings.length === 0 ? (
          <p className="flex items-center gap-2 bp-mono text-[11px] text-[var(--bp-line)]">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Nothing flagged here.
          </p>
        ) : (
          <div className="space-y-2">
            {findings.slice(0, 6).map((f) => (
              <div key={f.id} className="border border-[var(--bp-line-faint)] p-2.5">
                <SeverityBadge severity={f.severity} showDot />
                <p className="mt-1.5 text-[12px] leading-snug text-[var(--bp-ink)]">{f.title}</p>
                <p className="mt-0.5 break-all bp-mono text-[10.5px] text-[var(--bp-ink-dim)]">
                  {f.filePath}:{f.lineNumber}
                </p>
              </div>
            ))}
            <Link
              href={`/report/${encodeURIComponent(reportId)}/findings`}
              className="inline-block pt-1 bp-mono text-[11px] text-[var(--bp-line)] underline-offset-4 hover:underline"
            >
              Open in Findings →
            </Link>
          </div>
        )}
      </Section>
    </>
  );
}
