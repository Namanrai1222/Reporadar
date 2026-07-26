'use client';

import Link from 'next/link';
import { type LucideIcon, ArrowRight } from 'lucide-react';
import { GlobalRail } from '@/components/ui/GlobalRail';

/** Shared blueprint chrome for the app's list/utility pages. */
export function AppPage({
  fig,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  fig: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bp-ground)] md:flex-row">
      <GlobalRail />
      <main className="flex flex-1 flex-col pb-20 md:pb-0">
        <div className="border-b border-[var(--bp-line-faint)] px-5 py-4 md:px-8 md:py-5">
          <p className="bp-label mb-1">{fig}</p>
          <h1 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-[var(--bp-ink)] md:text-[22px]">
            <Icon className="h-5 w-5 text-[var(--bp-line)]" strokeWidth={1.5} />
            {title}
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--bp-ink-dim)]">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center border border-[var(--bp-line-faint)]">
          <span className="bp-reg" style={{ top: -1, left: -1 }} />
          <span className="bp-reg tr" style={{ top: -1, right: -1 }} />
          <span className="bp-reg bl" style={{ bottom: -1, left: -1 }} />
          <span className="bp-reg br" style={{ bottom: -1, right: -1 }} />
          <Icon className="h-7 w-7 text-[var(--bp-line)]" strokeWidth={1.25} />
        </div>
        <h2 className="mb-2 text-[16px] font-semibold text-[var(--bp-ink)]">{title}</h2>
        <p className="mb-6 text-[13px] leading-relaxed text-[var(--bp-ink-dim)]">{body}</p>
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 border border-[var(--bp-line)] bg-[color-mix(in_oklab,var(--bp-line)_14%,transparent)] px-4 py-2.5 bp-mono text-[12px] tracking-wide text-[var(--bp-ink)] transition-colors hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)]"
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
