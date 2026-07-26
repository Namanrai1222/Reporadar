'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportShell } from '@/components/ui/ReportShell';
import { useReportData } from '@/lib/use-report';

// Client component that resolves the report (inline ?data= or fetched by id).
function ReportLayoutContent({
  children,
  reportId,
}: {
  children: React.ReactNode;
  reportId: string;
}) {
  const searchParams = useSearchParams();
  const { report, saved } = useReportData(reportId, searchParams.get('data'));

  return (
    <ReportShell report={report} reportId={reportId} initialSaved={saved}>
      {children}
    </ReportShell>
  );
}

// Wrapper that resolves the params promise on the client
function ReportParamsWrapper({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ReportLayoutContent reportId={id}>{children}</ReportLayoutContent>;
}

export default function ReportLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#111416] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#364047] border-t-[#63D7D1] rounded-full animate-spin" />
        </div>
      }
    >
      <ReportParamsWrapper params={params}>{children}</ReportParamsWrapper>
    </Suspense>
  );
}
