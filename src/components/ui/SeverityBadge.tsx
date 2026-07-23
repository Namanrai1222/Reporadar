import { type Severity } from '@/lib/types';

const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; dot: string }> = {
  critical: {
    label: 'Critical',
    bg: 'bg-[#F07167]/15',
    text: 'text-[#F07167]',
    dot: 'bg-[#F07167]',
  },
  high: {
    label: 'High',
    bg: 'bg-[#F1BC62]/15',
    text: 'text-[#F1BC62]',
    dot: 'bg-[#F1BC62]',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-[#B9A8FF]/15',
    text: 'text-[#B9A8FF]',
    dot: 'bg-[#B9A8FF]',
  },
  low: {
    label: 'Low',
    bg: 'bg-[#63D7D1]/15',
    text: 'text-[#63D7D1]',
    dot: 'bg-[#63D7D1]',
  },
  info: {
    label: 'Info',
    bg: 'bg-[#A9B3B8]/15',
    text: 'text-[#A9B3B8]',
    dot: 'bg-[#A9B3B8]',
  },
};

export function SeverityBadge({ severity, showDot = true }: { severity: Severity; showDot?: boolean }) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium font-mono tracking-wide uppercase ${config.bg} ${config.text}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </span>
  );
}
