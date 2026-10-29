'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useReportData } from '@/lib/use-report';
import { reportStructure } from '@/lib/structure';
import { ArchitectureView } from '@/components/report/ArchitectureView';

export default function ArchitecturePage() {
  const params = useParams<{ id: string }>();
  const { report, loading } = useReportData(params.id);
  const mapped = useMemo(() => report && reportStructure(report), [report]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 bp-mono text-[13px] text-[var(--bp-ink-dim)]">
        Loading report…
      </div>
    );
  }
  if (!report || !mapped) return null; // the report shell shows why

  return <ArchitectureView report={report} structure={mapped.structure} partial={mapped.partial} linkable={params.id !== 'demo'} />;
}
