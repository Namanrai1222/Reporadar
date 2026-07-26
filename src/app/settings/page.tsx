'use client';

import Link from 'next/link';
import { Settings as SettingsIcon, LogIn, LogOut, ShieldCheck, Info } from 'lucide-react';
import { AppPage } from '@/components/ui/AppPage';
import { useAuth } from '@/lib/use-auth';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_45%,transparent)]">
      <div className="border-b border-[var(--bp-line-faint)] px-5 py-2.5">
        <p className="bp-label">{label}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { ready, authenticated, email, signOut } = useAuth();

  return (
    <AppPage fig="FIG.04 — SETTINGS" icon={SettingsIcon} title="Settings" subtitle="Account and application preferences.">
      <div className="mx-auto grid w-full max-w-2xl gap-4 px-5 py-6 md:px-8">
        <Section label="Account">
          {!ready ? (
            <p className="bp-mono text-[12px] text-[var(--bp-ink-dim)]">Loading…</p>
          ) : authenticated ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="bp-mono text-[13px] text-[var(--bp-ink)]">{email ?? 'Signed in'}</p>
                <p className="mt-0.5 bp-mono text-[11px] text-[var(--bp-ink-dim)]">Active session</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 border border-[var(--bp-line-faint)] px-4 py-2 bp-mono text-[12px] text-[var(--bp-ink-dim)] transition-colors hover:border-[var(--bp-line)] hover:text-[var(--bp-ink)]"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="bp-mono text-[12px] text-[var(--bp-ink-dim)]">Not signed in.</p>
              <Link
                href="/signin"
                className="inline-flex items-center gap-2 border border-[var(--bp-line)] bg-[color-mix(in_oklab,var(--bp-line)_14%,transparent)] px-4 py-2 bp-mono text-[12px] text-[var(--bp-ink)] transition-colors hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)]"
              >
                <LogIn className="h-4 w-4" strokeWidth={1.5} />
                Sign in
              </Link>
            </div>
          )}
        </Section>

        <Section label="Privacy">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bp-line)]" strokeWidth={1.5} />
            <p className="text-[13px] leading-relaxed text-[var(--bp-ink-dim)]">
              RepoRadar performs static analysis only — repository source is never executed or stored. Reduced-motion
              preferences from your system are respected automatically across the app.
            </p>
          </div>
        </Section>

        <Section label="About">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bp-line)]" strokeWidth={1.5} />
            <div className="bp-mono text-[12px] text-[var(--bp-ink-dim)]">
              <p>RepoRadar · v0.1.0 · REV A</p>
              <p className="mt-1">Public repositories · Deterministic analysis + grounded AI synthesis</p>
            </div>
          </div>
        </Section>
      </div>
    </AppPage>
  );
}
