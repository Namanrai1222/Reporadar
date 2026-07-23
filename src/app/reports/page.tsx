'use client';

import { FolderOpen } from 'lucide-react';
import { AppPage, EmptyState } from '@/components/ui/AppPage';

export default function ReportsPage() {
  return (
    <AppPage fig="FIG.03 — ARCHIVE" icon={FolderOpen} title="Saved Reports" subtitle="Bookmarked analysis results">
      <EmptyState
        icon={FolderOpen}
        title="No saved reports"
        body="Reports you bookmark will appear here for quick access."
        ctaHref="/dashboard"
        ctaLabel="Run a scan"
      />
    </AppPage>
  );
}
