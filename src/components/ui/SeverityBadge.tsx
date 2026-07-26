import { type Severity } from '@/lib/types';

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string }> = {
  critical: { label: 'CRITICAL', color: 'var(--bp-critical)' },
  high: { label: 'HIGH', color: 'var(--bp-alert)' },
  medium: { label: 'MEDIUM', color: '#b9a8ff' },
  low: { label: 'LOW', color: 'var(--bp-line)' },
  info: { label: 'INFO', color: 'var(--bp-ink-dim)' },
};

export function SeverityBadge({ severity, showDot = true }: { severity: Severity; showDot?: boolean }) {
  const { label, color } = SEVERITY_CONFIG[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-2 py-0.5 bp-mono text-[10px] tracking-[0.12em]"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
        background: `color-mix(in oklab, ${color} 9%, transparent)`,
      }}
    >
      {showDot && <span className="h-1.5 w-1.5" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />}
      {label}
    </span>
  );
}

export function severityColor(severity: Severity): string {
  return SEVERITY_CONFIG[severity].color;
}
