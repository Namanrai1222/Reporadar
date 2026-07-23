'use client';

import { History } from 'lucide-react';
import { AppPage, EmptyState } from '@/components/ui/AppPage';

export default function HistoryPage() {
  return (
    <AppPage fig="FIG.02 — LOG" icon={History} title="Scan History" subtitle="Previously analyzed repositories">
      <EmptyState
        icon={History}
        title="No scan history yet"
        body="Run a scan from the dashboard to see your analysis history here."
        ctaHref="/dashboard"
        ctaLabel="Start a new scan"
      />
    </AppPage>
  );
}
