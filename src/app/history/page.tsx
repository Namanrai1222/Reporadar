'use client';

import Link from 'next/link';
import { GlobalRail } from '@/components/ui/GlobalRail';
import { History, ArrowRight } from 'lucide-react';

export default function HistoryPage() {
  return (
    <div className="flex min-h-screen bg-[#111416]">
      <GlobalRail />
      <main className="flex-1 flex flex-col">
        <div className="border-b border-[#364047] px-8 py-5">
          <h1 className="text-[22px] font-semibold text-[#F2F4F0] tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#63D7D1]" />
            Scan History
          </h1>
          <p className="text-[13px] text-[#A9B3B8] mt-0.5">Previously analyzed repositories</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#22292D] border border-[#364047] flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-[#364047]" />
            </div>
            <h2 className="text-[16px] font-semibold text-[#F2F4F0] mb-2">No scan history yet</h2>
            <p className="text-[13px] text-[#A9B3B8] mb-6 leading-relaxed">
              Run a scan from the dashboard to see your analysis history here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#63D7D1] text-[#111416] font-semibold text-[13px] hover:bg-[#7ee5e0] transition-colors"
            >
              Start a new scan
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
