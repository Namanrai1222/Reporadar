'use client';

/**
 * The codebase drawn as a plan-view engineering schematic:
 * labelled modules, measured connectors that draw on, dimension
 * lines with callouts, and a single alert annotation. On-theme
 * for a repository-mapping tool, and deliberately not an orb.
 */

interface Mod {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub: string;
  alert?: boolean;
}

const MODS: Mod[] = [
  { id: 'ui', x: 48, y: 96, w: 132, h: 62, label: 'ui/', sub: '34 components' },
  { id: 'api', x: 500, y: 96, w: 132, h: 62, label: 'api/', sub: '47 routes' },
  { id: 'core', x: 262, y: 196, w: 156, h: 82, label: 'app/', sub: 'entry · router' },
  { id: 'lib', x: 48, y: 316, w: 132, h: 62, label: 'lib/', sub: 'utils · db' },
  { id: 'auth', x: 500, y: 316, w: 132, h: 62, label: 'auth', sub: '/api/admin', alert: true },
];

const CENTER = { x: 340, y: 237 };
function anchor(m: Mod) {
  return { x: m.x + m.w / 2, y: m.y + m.h / 2 };
}

export function BlueprintSchematic() {
  return (
    <svg viewBox="0 0 680 470" className="h-full w-full" role="img" aria-label="Repository architecture schematic">
      <defs>
        <marker id="bp-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M1,1 L7,4 L1,7" fill="none" stroke="var(--bp-line)" strokeWidth="1" />
        </marker>
        <marker id="bp-tick" markerWidth="6" markerHeight="8" refX="3" refY="4" orient="auto">
          <line x1="3" y1="1" x2="3" y2="7" stroke="var(--bp-line)" strokeWidth="1" />
        </marker>
      </defs>

      {/* ── connectors (draw on) — radiate from the app/ hub ── */}
      {MODS.filter((m) => m.id !== 'core').map((m, i) => {
        const a = anchor(m);
        const len = Math.hypot(a.x - CENTER.x, a.y - CENTER.y) + 4;
        return (
          <line
            key={`edge-${m.id}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={a.x}
            y2={a.y}
            stroke={m.alert ? 'var(--bp-alert)' : 'var(--bp-line-soft)'}
            strokeWidth="1.25"
            className="bp-draw"
            style={{ ['--len' as string]: `${Math.round(len)}`, animationDelay: `${0.5 + i * 0.12}s` } as React.CSSProperties}
          />
        );
      })}

      {/* junction nodes (skip the hub itself) */}
      {MODS.filter((m) => m.id !== 'core').map((m) => {
        const a = anchor(m);
        return <circle key={`jn-${m.id}`} cx={a.x} cy={a.y} r="2.5" fill={m.alert ? 'var(--bp-alert)' : 'var(--bp-line)'} />;
      })}

      {/* ── modules ── */}
      {MODS.map((m) => (
        <g key={m.id} style={{ animation: 'bp-fade .6s ease forwards', opacity: 0, animationDelay: '.15s' }}>
          <rect
            x={m.x}
            y={m.y}
            width={m.w}
            height={m.h}
            rx="2"
            fill="color-mix(in oklab, var(--bp-line) 6%, transparent)"
            stroke={m.alert ? 'var(--bp-alert)' : 'var(--bp-line)'}
            strokeWidth="1"
          />
          {/* corner ticks on each module */}
          {[
            [m.x, m.y],
            [m.x + m.w, m.y],
            [m.x, m.y + m.h],
            [m.x + m.w, m.y + m.h],
          ].map(([cx, cy], i) => (
            <g key={i} stroke={m.alert ? 'var(--bp-alert)' : 'var(--bp-line-soft)'} strokeWidth="1">
              <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} />
              <line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} />
            </g>
          ))}
          <text x={m.x + 12} y={m.y + 26} className="bp-mono" fontSize="14" fill="var(--bp-ink)" fontWeight="500">
            {m.label}
          </text>
          <text x={m.x + 12} y={m.y + 44} fontSize="9.5" fill="var(--bp-ink-dim)" fontFamily="var(--font-jetbrains-mono), monospace">
            {m.sub}
          </text>
        </g>
      ))}

      {/* hub marker — small node on the app/ box lower edge, clear of the label */}
      <circle cx={CENTER.x} cy={264} r="3" fill="var(--bp-line)" />
      <circle cx={CENTER.x} cy={264} r="7" fill="none" stroke="var(--bp-line)" strokeWidth="1" opacity="0.5" />

      {/* ── dimension line: overall width, top ── */}
      <g stroke="var(--bp-line-soft)" strokeWidth="1">
        <line x1="48" y1="60" x2="632" y2="60" markerStart="url(#bp-tick)" markerEnd="url(#bp-tick)" />
        <line x1="48" y1="52" x2="48" y2="68" />
        <line x1="632" y1="52" x2="632" y2="68" />
      </g>
      <rect x="312" y="50" width="56" height="18" fill="var(--bp-ground)" />
      <text x="340" y="63" textAnchor="middle" className="bp-mono" fontSize="10" fill="var(--bp-line)">
        1200u
      </text>

      {/* ── dimension line: overall height, right ── */}
      <g stroke="var(--bp-line-soft)" strokeWidth="1">
        <line x1="656" y1="96" x2="656" y2="378" markerStart="url(#bp-tick)" markerEnd="url(#bp-tick)" />
      </g>
      <text x="656" y="242" textAnchor="middle" className="bp-mono" fontSize="10" fill="var(--bp-line)" transform="rotate(90 656 242)">
        760u
      </text>

      {/* ── alert callout on auth ── */}
      <g>
        <line x1="566" y1="316" x2="566" y2="286" stroke="var(--bp-alert)" strokeWidth="1" />
        <line x1="566" y1="286" x2="470" y2="286" stroke="var(--bp-alert)" strokeWidth="1" markerEnd="url(#bp-arrow)" />
        <text x="470" y="282" textAnchor="end" className="bp-mono" fontSize="10" fill="var(--bp-alert)">
          ⚠ MISSING AUTH
        </text>
      </g>

      {/* fig caption */}
      <text x="48" y="424" className="bp-mono" fontSize="10" fill="var(--bp-ink-dim)">
        FIG.01 — MODULE TOPOLOGY · facebook/react · rev A
      </text>
    </svg>
  );
}
