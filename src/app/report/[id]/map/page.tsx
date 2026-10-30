'use client';

import { useParams } from 'next/navigation';
import { useReportData } from '@/lib/use-report';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Report, CodeNode } from '@/lib/types';
import { X, FileCode, Globe, Database, Link2, Server, Leaf, Map as MapIcon, Radar, Workflow } from 'lucide-react';
import { ArchitectureMap } from '@/components/report/ArchitectureMap';
import { reportStructure } from '@/lib/structure';
import { SeverityBadge } from '@/components/ui/SeverityBadge';

// Report is always fetched by id; contents never travel in the URL.

const NODE_TYPE_CONFIG: Record<CodeNode['type'], { label: string; color: string; icon: typeof FileCode }> = {
  client_page: { label: 'Client Page', color: '#b9a8ff', icon: Globe },
  api_route: { label: 'API Route', color: '#7fb6c9', icon: Server },
  service: { label: 'Service', color: '#9fdc7a', icon: Server },
  database: { label: 'Database', color: '#f4b45a', icon: Database },
  env_var: { label: 'Env Variable', color: '#9db9c4', icon: Leaf },
  external_api: { label: 'External API', color: '#ff6b5e', icon: Link2 },
  file: { label: 'File', color: '#6a828d', icon: FileCode },
};

// Legend mirrors the actual per-type node colors (nodes are colored by type,
// not by layer), so what the reader sees on the canvas matches the key.
const TYPE_LEGEND: [string, string][] = (Object.keys(NODE_TYPE_CONFIG) as CodeNode['type'][]).map(
  (t) => [NODE_TYPE_CONFIG[t].label, NODE_TYPE_CONFIG[t].color],
);

interface GraphNode {
  id: string;
  x: number;
  y: number;
  node: CodeNode;
}

const NODE_W = 200;
const NODE_H = 40;

function buildLayout(nodes: CodeNode[]): GraphNode[] {
  const layerMap: Record<string, number> = { client: 0, application: 1, external: 2, data: 3 };
  const layerGroups: Record<number, CodeNode[]> = { 0: [], 1: [], 2: [], 3: [] };

  for (const node of nodes) {
    const layer = layerMap[node.layer] ?? 1;
    layerGroups[layer].push(node);
  }

  const result: GraphNode[] = [];
  const COLUMN_GAP = 90;
  const ROW_GAP = 24;

  for (let layer = 0; layer < 4; layer++) {
    const group = layerGroups[layer];
    const totalH = group.length * NODE_H + (group.length - 1) * ROW_GAP;
    // Columns are centred on y=0; the viewBox fits whatever height results,
    // so tall columns never clamp onto each other.
    group.forEach((node, i) => {
      result.push({
        id: node.id,
        x: layer * (NODE_W + COLUMN_GAP),
        y: -totalH / 2 + i * (NODE_H + ROW_GAP),
        node,
      });
    });
  }
  return result;
}

/**
 * viewBox around the drawing. At least the canvas's own pixel size, so a small
 * graph renders 1:1 instead of being blown up, and a large one shrinks to fit.
 */
function fitViewBox(graph: GraphNode[], canvas: { w: number; h: number }): string {
  if (graph.length === 0) return `0 0 ${canvas.w} ${canvas.h}`;
  const xs = graph.map((n) => n.x);
  const ys = graph.map((n) => n.y);
  const minX = Math.min(...xs) - 48;
  const minY = Math.min(...ys) - 48;
  const w = Math.max(...xs) + NODE_W + 48 - minX;
  const h = Math.max(...ys) + NODE_H + 48 - minY;
  const vw = Math.max(w, canvas.w);
  const vh = Math.max(h, canvas.h);
  return `${minX - (vw - w) / 2} ${minY - (vh - h) / 2} ${vw} ${vh}`;
}

export default function MapPage() {
  const params = useParams<{ id: string }>();
  const { report, loading } = useReportData(params.id);
  const [view, setView] = useState<'architecture' | 'flow'>('architecture');

  const mapped = useMemo(() => report && reportStructure(report), [report]);
  const structure = mapped?.structure;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bp-mono text-[13px] text-[var(--bp-ink-dim)]">
        Loading report…
      </div>
    );
  }
  if (!report || !structure) return null; // the report shell shows why

  const hasFlow = report.nodes.length > 0;
  const tabs = [
    { id: 'architecture' as const, label: 'Architecture', icon: Radar, enabled: true },
    { id: 'flow' as const, label: 'Code flow', icon: Workflow, enabled: hasFlow },
  ];

  return (
    <div className="-mx-5 flex flex-col md:-mx-6 lg:h-[calc(100vh-190px)] lg:min-h-[600px]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--bp-line-faint)] px-5 py-2.5 md:px-6">
        <div role="tablist" aria-label="Map view" className="flex border border-[var(--bp-line-faint)]">
          {tabs.map(({ id, label, icon: Icon, enabled }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={view === id}
              disabled={!enabled}
              title={enabled ? undefined : 'No routes, pages or env usage detected in this repository'}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 bp-mono text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                view === id
                  ? 'bg-[color-mix(in_oklab,var(--bp-line)_14%,transparent)] text-[var(--bp-ink)]'
                  : 'text-[var(--bp-ink-dim)] hover:text-[var(--bp-ink)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>
        <p className="bp-mono text-[11px] text-[var(--bp-ink-dim)]">
          {view === 'architecture' ? 'FIG.03 — Repository radar · every folder, flagged or not' : 'FIG.04 — Pages, routes and env usage'}
        </p>
      </div>
      {view === 'flow' && hasFlow ? (
        <CodeFlow />
      ) : (
        <ArchitectureMap report={report} structure={structure} partial={mapped!.partial} />
      )}
    </div>
  );
}

function CodeFlow() {
  const params = useParams<{ id: string }>();
  const reportData = useReportData(params.id);
  const report: Report | null = reportData.report;
  const svgRef = useRef<SVGSVGElement>(null);

  const [selectedNode, setSelectedNode] = useState<CodeNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const nodes = useMemo(() => report?.nodes ?? [], [report?.nodes]);
  const edges = useMemo(() => report?.edges ?? [], [report?.edges]);

  const graphNodes = useMemo(() => buildLayout(nodes), [nodes]);
  const nodeMap = useMemo(() => Object.fromEntries(graphNodes.map((n) => [n.id, n])), [graphNodes]);
  const [canvas, setCanvas] = useState({ w: 900, h: 420 });
  const viewBox = useMemo(() => fitViewBox(graphNodes, canvas), [graphNodes, canvas]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as SVGElement).closest('[data-node]')) return;
      setDragging(true);
      // Pointer moves in screen px; the drawing lives in viewBox units.
      const k = svgRef.current?.getScreenCTM()?.a ?? 1;
      setDragStart({ x: e.clientX - transform.x * k, y: e.clientY - transform.y * k });
    },
    [transform],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const k = svgRef.current?.getScreenCTM()?.a ?? 1;
      setTransform((t) => ({ ...t, x: (e.clientX - dragStart.x) / k, y: (e.clientY - dragStart.y) / k }));
    },
    [dragging, dragStart],
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({ ...t, scale: Math.min(2.5, Math.max(0.3, t.scale * scaleDelta)) }));
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setCanvas({ w: Math.round(width), h: Math.round(height) });
    });
    observer.observe(svg);
    return () => {
      svg.removeEventListener('wheel', handleWheel);
      observer.disconnect();
    };
  }, [handleWheel, report]);

  const selectedNodeRelatedFindings =
    report?.findings.filter((f) => f.relatedNodeIds.includes(selectedNode?.id ?? '')) ?? [];

  if (reportData.loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bp-mono text-[13px] text-[var(--bp-ink-dim)]">
        Loading report…
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-[60vh] items-center justify-center bp-mono text-[13px] text-[var(--bp-ink-dim)]">
        No report data. Run a scan first.
      </div>
    );
  }

  return (
    <div className="flex h-[70vh] min-h-0 flex-1 overflow-hidden lg:h-auto">
      {/* Canvas — yields to the inspector on mobile (matches findings-page pattern) */}
      <div className={`relative flex-1 flex-col overflow-hidden ${selectedNode ? 'hidden sm:flex' : 'flex'}`}>
        <div className="bp-paper relative flex-1 overflow-hidden">
        {/* Controls */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
            className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_88%,transparent)] px-3 py-1.5 bp-mono text-[11px] text-[var(--bp-ink-dim)] transition-colors hover:border-[var(--bp-line)] hover:text-[var(--bp-ink)]"
          >
            Reset view
          </button>
        </div>

        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label="Code map"
          className="h-full w-full"
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Edges */}
            {edges.map((edge, i) => {
              const from = nodeMap[edge.from];
              const to = nodeMap[edge.to];
              if (!from || !to) return null;
              const isRisky = edge.type === 'risky_path';
              const dim = hoveredNode && hoveredNode !== edge.from && hoveredNode !== edge.to;
              return (
                <g key={i} opacity={dim ? 0.2 : 1}>
                  <path
                    d={`M ${from.x + NODE_W} ${from.y + NODE_H / 2} C ${from.x + NODE_W + 60} ${from.y + NODE_H / 2}, ${to.x - 60} ${to.y + NODE_H / 2}, ${to.x} ${to.y + NODE_H / 2}`}
                    fill="none"
                    stroke={isRisky ? 'var(--bp-critical)' : 'var(--bp-line-soft)'}
                    strokeWidth={isRisky ? 1.5 : 1}
                    strokeDasharray={isRisky ? '5 4' : undefined}
                  />
                  <text
                    x={(from.x + NODE_W + to.x) / 2}
                    y={(from.y + to.y) / 2 + NODE_H / 2 - 6}
                    fill="var(--bp-ink-dim)"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="var(--font-jetbrains-mono), monospace"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {graphNodes.map(({ id, x, y, node }) => {
              const config = NODE_TYPE_CONFIG[node.type] ?? NODE_TYPE_CONFIG.file;
              const isSelected = selectedNode?.id === id;
              const isHovered = hoveredNode === id;
              const hasRisk = node.riskLevel && ['critical', 'high'].includes(node.riskLevel);
              const Icon = config.icon;
              const stroke = isSelected
                ? config.color
                : hasRisk
                  ? 'var(--bp-critical)'
                  : isHovered
                    ? config.color
                    : 'var(--bp-line-faint)';

              return (
                <g
                  key={id}
                  data-node="true"
                  transform={`translate(${x}, ${y})`}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${config.label}: ${node.label}`}
                  aria-pressed={isSelected}
                  className="outline-none [&:focus-visible>rect:first-of-type]:stroke-[var(--bp-line)]"
                  onClick={() => setSelectedNode(isSelected ? null : node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedNode(isSelected ? null : node);
                    }
                  }}
                  onFocus={() => setHoveredNode(id)}
                  onBlur={() => setHoveredNode(null)}
                  onMouseEnter={() => setHoveredNode(id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  opacity={hoveredNode && !isHovered && !isSelected ? 0.45 : 1}
                >
                  <title>{node.filePath ?? node.label}</title>
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    fill={isSelected ? 'color-mix(in oklab, var(--bp-line) 10%, var(--bp-ground-2))' : 'var(--bp-ground-2)'}
                    stroke={stroke}
                    strokeWidth={isSelected || hasRisk ? 1.5 : 1}
                  />
                  {/* corner ticks */}
                  {[
                    [0, 0],
                    [NODE_W, 0],
                    [0, NODE_H],
                    [NODE_W, NODE_H],
                  ].map(([cx, cy], k) => (
                    <g key={k} stroke={stroke} strokeWidth="1">
                      <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} />
                      <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} />
                    </g>
                  ))}
                  {hasRisk && (
                    <rect
                      x={NODE_W - 8}
                      y={0}
                      width={4}
                      height={4}
                      fill={node.riskLevel === 'critical' ? 'var(--bp-critical)' : 'var(--bp-alert)'}
                    />
                  )}
                  <foreignObject x={8} y={8} width={NODE_W - 16} height={24}>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span
                        className="grid h-5 w-5 shrink-0 place-items-center border"
                        style={{ borderColor: config.color }}
                      >
                        <Icon className="h-3 w-3" style={{ color: config.color }} strokeWidth={1.5} />
                      </span>
                      <span className="truncate bp-mono text-[11px] text-[var(--bp-ink)]">{node.label}</span>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        </svg>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapIcon className="mx-auto mb-3 h-10 w-10 text-[var(--bp-line)]" strokeWidth={1.25} />
              <p className="text-[15px] font-medium text-[var(--bp-ink)]">No nodes to display</p>
              <p className="mt-1 bp-mono text-[12px] text-[var(--bp-ink-dim)]">
                This repository may not have detectable components.
              </p>
            </div>
          </div>
        )}
        </div>

        {/* Key — a strip under the drawing, so it never covers nodes */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] px-4 py-2.5">
          <span className="bp-label">Key</span>
          {TYPE_LEGEND.map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
              <span className="h-2 w-2" style={{ background: color }} />
              {label}
            </span>
          ))}
          <span className="ml-auto hidden bp-mono text-[10.5px] text-[var(--bp-ink-dim)] sm:inline">
            Drag to pan · scroll to zoom · Tab to step through nodes
          </span>
        </div>
      </div>

      {/* Inspector */}
      {selectedNode && (
        <div className="flex w-full shrink-0 flex-col overflow-y-auto border-l border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] sm:w-[330px]">
          <div className="flex items-center justify-between border-b border-[var(--bp-line-faint)] px-5 py-4">
            <h3 className="bp-label">Node inspector</h3>
            <button
              onClick={() => setSelectedNode(null)}
              aria-label="Close inspector"
              className="text-[var(--bp-ink-dim)] transition-colors hover:text-[var(--bp-ink)]"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <p className="bp-label mb-1">Label</p>
              <p className="bp-mono text-[14px] text-[var(--bp-ink)]">{selectedNode.label}</p>
            </div>
            <div>
              <p className="bp-label mb-1">Type</p>
              <span
                className="inline-block border px-2 py-0.5 bp-mono text-[11px]"
                style={{
                  color: NODE_TYPE_CONFIG[selectedNode.type]?.color ?? 'var(--bp-ink-dim)',
                  borderColor: `color-mix(in oklab, ${NODE_TYPE_CONFIG[selectedNode.type]?.color ?? '#6a828d'} 40%, transparent)`,
                }}
              >
                {NODE_TYPE_CONFIG[selectedNode.type]?.label ?? selectedNode.type}
              </span>
            </div>
            <div>
              <p className="bp-label mb-1">Layer</p>
              <p className="bp-mono text-[13px] capitalize text-[var(--bp-ink-dim)]">{selectedNode.layer}</p>
            </div>
            {selectedNode.filePath && (
              <div>
                <p className="bp-label mb-1">File</p>
                <p className="break-all bp-mono text-[11px] text-[var(--bp-ink-dim)]">{selectedNode.filePath}</p>
              </div>
            )}
            {selectedNode.riskLevel && (
              <div>
                <p className="bp-label mb-1">Risk level</p>
                <SeverityBadge severity={selectedNode.riskLevel} />
              </div>
            )}
            {selectedNodeRelatedFindings.length > 0 && (
              <div>
                <p className="bp-label mb-2">Related findings</p>
                <div className="space-y-2">
                  {selectedNodeRelatedFindings.map((finding) => (
                    <div key={finding.id} className="border border-[var(--bp-line-faint)] p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <SeverityBadge severity={finding.severity} showDot />
                        <span className="bp-mono text-[10px] text-[var(--bp-ink-dim)]">{finding.ruleId}</span>
                      </div>
                      <p className="text-[12px] text-[var(--bp-ink)]">{finding.title}</p>
                      <p className="mt-1 text-[11px] text-[var(--bp-ink-dim)]">{finding.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
