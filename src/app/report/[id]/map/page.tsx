'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Report, CodeNode } from '@/lib/types';
import { X, FileCode, Globe, Database, Link2, Server, Leaf, Map as MapIcon } from 'lucide-react';
import { SeverityBadge } from '@/components/ui/SeverityBadge';

function getReport(dataParam: string | null): Report | null {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(dataParam)) as Report;
  } catch {
    return null;
  }
}

const NODE_TYPE_CONFIG: Record<CodeNode['type'], { label: string; color: string; icon: typeof FileCode }> = {
  client_page: { label: 'Client Page', color: '#b9a8ff', icon: Globe },
  api_route: { label: 'API Route', color: '#7fb6c9', icon: Server },
  service: { label: 'Service', color: '#9fdc7a', icon: Server },
  database: { label: 'Database', color: '#f4b45a', icon: Database },
  env_var: { label: 'Env Variable', color: '#9db9c4', icon: Leaf },
  external_api: { label: 'External API', color: '#ff6b5e', icon: Link2 },
  file: { label: 'File', color: '#6a828d', icon: FileCode },
};

const LAYER_LEGEND: [string, string][] = [
  ['Client', '#b9a8ff'],
  ['Application', '#7fb6c9'],
  ['External', '#ff6b5e'],
  ['Data', '#f4b45a'],
];

interface GraphNode {
  id: string;
  x: number;
  y: number;
  node: CodeNode;
}

function buildLayout(nodes: CodeNode[]): GraphNode[] {
  const layerMap: Record<string, number> = { client: 0, application: 1, external: 2, data: 3 };
  const layerGroups: Record<number, CodeNode[]> = { 0: [], 1: [], 2: [], 3: [] };

  for (const node of nodes) {
    const layer = layerMap[node.layer] ?? 1;
    layerGroups[layer].push(node);
  }

  const result: GraphNode[] = [];
  const LAYER_X = [80, 340, 600, 860];
  const NODE_HEIGHT = 64;
  const PADDING = 20;

  for (let layer = 0; layer < 4; layer++) {
    const group = layerGroups[layer];
    const totalH = group.length * NODE_HEIGHT + (group.length - 1) * PADDING;
    const startY = 200 - totalH / 2;
    group.forEach((node, i) => {
      result.push({
        id: node.id,
        x: LAYER_X[layer],
        y: Math.max(20, startY + i * (NODE_HEIGHT + PADDING)),
        node,
      });
    });
  }
  return result;
}

export default function CodeMapPage() {
  const searchParams = useSearchParams();
  const report = getReport(searchParams.get('data'));
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as SVGElement).closest('[data-node]')) return;
      setDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    },
    [transform],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setTransform((t) => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
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
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const selectedNodeRelatedFindings =
    report?.findings.filter((f) => f.relatedNodeIds.includes(selectedNode?.id ?? '')) ?? [];

  if (!report) {
    return (
      <div className="flex h-[60vh] items-center justify-center bp-mono text-[13px] text-[var(--bp-ink-dim)]">
        No report data. Run a scan first.
      </div>
    );
  }

  return (
    <div className="-mx-5 flex h-[calc(100vh-190px)] overflow-hidden md:-mx-6">
      {/* Canvas */}
      <div className="bp-paper relative flex-1 overflow-hidden">
        {/* Legend */}
        <div className="absolute left-4 top-4 z-10 border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_88%,transparent)] p-3 backdrop-blur-sm">
          <p className="bp-label mb-2">Layers</p>
          {LAYER_LEGEND.map(([label, color]) => (
            <div key={label} className="mb-1 flex items-center gap-2 bp-mono text-[11px] text-[var(--bp-ink-dim)]">
              <span className="h-2 w-2" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>

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
                    d={`M ${from.x + 100} ${from.y + 20} C ${from.x + 180} ${from.y + 20}, ${to.x - 80} ${to.y + 20}, ${to.x} ${to.y + 20}`}
                    fill="none"
                    stroke={isRisky ? 'var(--bp-critical)' : 'var(--bp-line-soft)'}
                    strokeWidth={isRisky ? 1.5 : 1}
                    strokeDasharray={isRisky ? '5 4' : undefined}
                  />
                  <text
                    x={(from.x + 100 + to.x) / 2}
                    y={Math.min(from.y, to.y) + 14}
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
                  onClick={() => setSelectedNode(isSelected ? null : node)}
                  onMouseEnter={() => setHoveredNode(id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  opacity={hoveredNode && !isHovered && !isSelected ? 0.45 : 1}
                >
                  <rect
                    width={160}
                    height={40}
                    fill={isSelected ? 'color-mix(in oklab, var(--bp-line) 10%, var(--bp-ground-2))' : 'var(--bp-ground-2)'}
                    stroke={stroke}
                    strokeWidth={isSelected || hasRisk ? 1.5 : 1}
                  />
                  {/* corner ticks */}
                  {[
                    [0, 0],
                    [160, 0],
                    [0, 40],
                    [160, 40],
                  ].map(([cx, cy], k) => (
                    <g key={k} stroke={stroke} strokeWidth="1">
                      <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} />
                      <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} />
                    </g>
                  ))}
                  {hasRisk && (
                    <rect
                      x={152}
                      y={0}
                      width={4}
                      height={4}
                      fill={node.riskLevel === 'critical' ? 'var(--bp-critical)' : 'var(--bp-alert)'}
                    />
                  )}
                  <foreignObject x={8} y={8} width={144} height={24}>
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
