'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Report, CodeNode } from '@/lib/types';
import { X, FileCode, Globe, Database, Link2, Server, Leaf } from 'lucide-react';
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
  client_page: { label: 'Client Page', color: '#B9A8FF', icon: Globe },
  api_route: { label: 'API Route', color: '#63D7D1', icon: Server },
  service: { label: 'Service', color: '#B7E36B', icon: Server },
  database: { label: 'Database', color: '#F1BC62', icon: Database },
  env_var: { label: 'Env Variable', color: '#A9B3B8', icon: Leaf },
  external_api: { label: 'External API', color: '#F07167', icon: Link2 },
  file: { label: 'File', color: '#364047', icon: FileCode },
};

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
  const nodeMap = useMemo(
    () => Object.fromEntries(graphNodes.map((n) => [n.id, n])),
    [graphNodes]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('[data-node]')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setTransform((t) => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }, [dragging, dragStart]);

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

  const selectedNodeRelatedFindings = report?.findings.filter((f) =>
    f.relatedNodeIds.includes(selectedNode?.id ?? '')
  ) ?? [];

  if (!report) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[#A9B3B8] text-[13px]">
        No report data. Run a scan first.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-160px)] -mx-6 overflow-hidden">
      {/* SVG Canvas */}
      <div className="flex-1 relative overflow-hidden bg-[#0d1014]">
        {/* Legend */}
        <div className="absolute top-4 left-4 z-10 p-3 rounded-xl bg-[#181D20]/90 border border-[#364047] backdrop-blur-sm">
          <p className="text-[10px] font-medium text-[#A9B3B8] uppercase tracking-widest mb-2">Layers</p>
          {['Client', 'Application', 'External', 'Data'].map((label, i) => (
            <div key={label} className="flex items-center gap-2 text-[11px] text-[#A9B3B8] mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: ['#B9A8FF', '#63D7D1', '#F07167', '#F1BC62'][i] }} />
              {label}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
            className="px-3 py-1.5 rounded-lg text-[11px] text-[#A9B3B8] bg-[#181D20]/90 border border-[#364047] hover:border-[#63D7D1] transition-all"
          >
            Reset View
          </button>
        </div>

        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a2026" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Edges */}
            {edges.map((edge, i) => {
              const from = nodeMap[edge.from];
              const to = nodeMap[edge.to];
              if (!from || !to) return null;
              const isRisky = edge.type === 'risky_path';
              return (
                <g key={i}>
                  <path
                    d={`M ${from.x + 100} ${from.y + 20} C ${from.x + 180} ${from.y + 20}, ${to.x - 80} ${to.y + 20}, ${to.x} ${to.y + 20}`}
                    fill="none"
                    stroke={isRisky ? '#F07167' : '#364047'}
                    strokeWidth={isRisky ? 2 : 1}
                    strokeDasharray={isRisky ? '4 4' : undefined}
                    opacity={hoveredNode && hoveredNode !== edge.from && hoveredNode !== edge.to ? 0.2 : 1}
                  />
                  <text
                    x={((from.x + 100) + to.x) / 2}
                    y={Math.min(from.y, to.y) + 14}
                    fill="#364047"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="monospace"
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

              return (
                <g
                  key={id}
                  data-node="true"
                  transform={`translate(${x}, ${y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedNode(isSelected ? null : node)}
                  onMouseEnter={() => setHoveredNode(id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x={0}
                    y={0}
                    width={160}
                    height={40}
                    rx={8}
                    fill={isSelected ? '#22292D' : '#181D20'}
                    stroke={isSelected ? config.color : hasRisk ? '#F07167' : isHovered ? config.color + '80' : '#364047'}
                    strokeWidth={isSelected || hasRisk ? 2 : 1}
                    opacity={hoveredNode && !isHovered && !isSelected ? 0.4 : 1}
                  />
                  {hasRisk && (
                    <circle cx={155} cy={4} r={4} fill={node.riskLevel === 'critical' ? '#F07167' : '#F1BC62'} />
                  )}
                  <foreignObject x={8} y={8} width={144} height={24}>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                        style={{ background: config.color + '20' }}
                      >
                        <Icon className="w-3 h-3" style={{ color: config.color }} />
                      </div>
                      <span className="text-[11px] font-mono truncate" style={{ color: '#F2F4F0' }}>
                        {node.label}
                      </span>
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
              <div className="text-[40px] mb-3">🗺️</div>
              <p className="text-[15px] font-medium text-[#F2F4F0]">No nodes to display</p>
              <p className="text-[13px] text-[#A9B3B8] mt-1">This repository may not have detectable components.</p>
            </div>
          </div>
        )}
      </div>

      {/* Inspector Panel */}
      {selectedNode && (
        <div className="w-[320px] shrink-0 border-l border-[#364047] bg-[#181D20] flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#364047]">
            <h3 className="text-[14px] font-semibold text-[#F2F4F0]">Node Inspector</h3>
            <button onClick={() => setSelectedNode(null)} className="text-[#A9B3B8] hover:text-[#F2F4F0]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] text-[#A9B3B8] uppercase tracking-widest mb-1">Label</p>
              <p className="text-[14px] font-mono text-[#F2F4F0] font-medium">{selectedNode.label}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#A9B3B8] uppercase tracking-widest mb-1">Type</p>
              <span
                className="px-2 py-0.5 rounded text-[11px] font-mono"
                style={{
                  background: (NODE_TYPE_CONFIG[selectedNode.type]?.color ?? '#364047') + '20',
                  color: NODE_TYPE_CONFIG[selectedNode.type]?.color ?? '#A9B3B8',
                }}
              >
                {NODE_TYPE_CONFIG[selectedNode.type]?.label ?? selectedNode.type}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-[#A9B3B8] uppercase tracking-widest mb-1">Layer</p>
              <p className="text-[13px] text-[#A9B3B8] capitalize">{selectedNode.layer}</p>
            </div>
            {selectedNode.filePath && (
              <div>
                <p className="text-[10px] text-[#A9B3B8] uppercase tracking-widest mb-1">File</p>
                <p className="text-[11px] font-mono text-[#A9B3B8] break-all">{selectedNode.filePath}</p>
              </div>
            )}
            {selectedNode.riskLevel && (
              <div>
                <p className="text-[10px] text-[#A9B3B8] uppercase tracking-widest mb-1">Risk Level</p>
                <SeverityBadge severity={selectedNode.riskLevel} />
              </div>
            )}
            {selectedNodeRelatedFindings.length > 0 && (
              <div>
                <p className="text-[10px] text-[#A9B3B8] uppercase tracking-widest mb-2">Related Findings</p>
                <div className="space-y-2">
                  {selectedNodeRelatedFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className="p-3 rounded-lg bg-[#22292D] border border-[#364047]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={finding.severity} showDot />
                        <span className="text-[10px] font-mono text-[#364047]">{finding.ruleId}</span>
                      </div>
                      <p className="text-[12px] text-[#F2F4F0]">{finding.title}</p>
                      <p className="text-[11px] text-[#A9B3B8] mt-1">{finding.explanation}</p>
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
