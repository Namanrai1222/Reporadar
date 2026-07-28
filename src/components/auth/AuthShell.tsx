'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';
import { RepoRadarLogo } from '@/components/brand/RepoRadarLogo';
import {
  fetchEnabledProviders,
  signInWithGitHub,
  signInWithGoogle,
  type OAuthProvider,
} from '@/lib/auth-client';
import { BlueprintSchematic } from '@/components/landing/BlueprintSchematic';

// 3D isometric wireframe — same rotating plate as the landing hero,
// progressively enhancing the 2D schematic once the client mounts.
const Axonometric = dynamic(() => import('@/components/landing/Axonometric').then((m) => m.Axonometric), {
  ssr: false,
  loading: () => <BlueprintSchematic />,
});

/**
 * Two-pane drafting sheet: the form on the left, a schematic plate on
 * the right. The plate collapses away below `lg` so the form owns the
 * full width on phones.
 */
export function AuthShell({
  sheet,
  title,
  subtitle,
  children,
  footer,
}: {
  /** e.g. "SHEET 00 — ACCESS" */
  sheet: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--bp-ground)]">
      {/* form pane */}
      <div className="bp-paper flex w-full flex-col px-5 py-8 sm:px-10 lg:w-[52%] lg:px-16">
        <Link href="/" className="inline-flex w-fit" aria-label="RepoRadar home">
          <RepoRadarLogo size={30} wordClassName="text-[15px]" />
        </Link>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[400px] py-10">
            <p className="bp-label mb-3">{sheet}</p>
            <h1 className="font-display text-[clamp(1.8rem,4vw,2.4rem)] font-semibold leading-tight text-[var(--bp-ink)]">
              {title}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--bp-ink-dim)]">{subtitle}</p>

            <div className="mt-8">{children}</div>
          </div>
        </div>

        <div className="bp-mono text-[10.5px] text-[color-mix(in_oklab,var(--bp-ink-dim)_75%,transparent)]">
          {footer}
        </div>
      </div>

      {/* schematic plate */}
      <aside className="relative hidden border-l border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] lg:flex lg:w-[48%] lg:flex-col lg:justify-center lg:px-14">
        <span className="bp-reg" style={{ top: 28, left: 28 }} />
        <span className="bp-reg tr" style={{ top: 28, right: 28 }} />
        <span className="bp-reg bl" style={{ bottom: 28, left: 28 }} />
        <span className="bp-reg br" style={{ bottom: 28, right: 28 }} />

        <p className="bp-label mb-6">FIG.00 — SYSTEM OVERVIEW</p>
        <div className="bp-frame aspect-[68/47] w-full overflow-hidden bg-[color-mix(in_oklab,var(--bp-ground)_50%,transparent)] p-3">
          <Axonometric />
        </div>

        <div className="mt-8 grid grid-cols-3 border border-[var(--bp-line-faint)] bp-mono text-[10px]">
          {[
            ['SCANNERS', '10+'],
            ['TIME', '<30s'],
            ['STORED', '0'],
          ].map(([k, v], i) => (
            <div key={k} className={`px-4 py-3 ${i < 2 ? 'border-r border-[var(--bp-line-faint)]' : ''}`}>
              <div className="text-[9px] tracking-[0.16em] text-[var(--bp-line)]">{k}</div>
              <div className="mt-1 text-[15px] text-[var(--bp-ink)]">{v}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ---------- shared form primitives ---------- */

/** lucide dropped its brand glyphs, so the GitHub mark ships inline. */
export function GitHubIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** Official multi-colour Google "G" mark. */
export function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

/**
 * Social sign-in buttons shared by the sign-in and sign-up pages.
 *
 * A provider is only clickable once the server confirms it is enabled in the
 * Supabase project. Sending the browser to `/authorize` for a provider that is
 * not configured lands the user on a bare GoTrue JSON error with no route back
 * into the app, so an unavailable provider is disabled and labelled instead.
 */
export function OAuthButtons({ onError }: { onError: (message: string) => void }) {
  const [available, setAvailable] = useState<Record<OAuthProvider, boolean> | null>(null);

  useEffect(() => {
    let active = true;
    fetchEnabledProviders().then((providers) => {
      if (active) setAvailable(providers);
    });
    return () => {
      active = false;
    };
  }, []);

  const start = (provider: OAuthProvider, fn: (path: string) => void, label: string) => {
    if (available && !available[provider]) {
      onError(`${label} sign-in is unavailable right now — please use your email and password below.`);
      return;
    }
    try {
      fn('/dashboard');
    } catch (err) {
      onError(err instanceof Error ? err.message : `Could not start ${label} sign-in.`);
    }
  };

  const providers: { id: OAuthProvider; label: string; icon: ReactNode; go: (path: string) => void }[] = [
    { id: 'github', label: 'GitHub', icon: <GitHubIcon />, go: signInWithGitHub },
    { id: 'google', label: 'Google', icon: <GoogleIcon />, go: signInWithGoogle },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {providers.map(({ id, label, icon, go }) => {
        // `null` = still checking; keep buttons live so the page is usable immediately.
        const unavailable = available !== null && !available[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => start(id, go, label)}
            disabled={unavailable}
            title={unavailable ? `${label} sign-in is not configured for this deployment` : undefined}
            className={`flex w-full items-center justify-center gap-2.5 border px-6 py-3 bp-mono text-[12.5px] tracking-wide transition-colors ${
              unavailable
                ? 'cursor-not-allowed border-[var(--bp-line-faint)] text-[color-mix(in_oklab,var(--bp-ink-dim)_60%,transparent)] opacity-60'
                : 'border-[var(--bp-line-faint)] text-[var(--bp-ink)] hover:border-[var(--bp-line)]'
            }`}
          >
            <span className={unavailable ? 'opacity-50 grayscale' : undefined}>{icon}</span>
            Continue with {label}
            {unavailable && <span className="text-[10px] tracking-normal">(unavailable)</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="bp-label">
          {label}
        </label>
        {hint && <span className="bp-mono text-[10px] text-[var(--bp-ink-dim)]">{hint}</span>}
      </div>
      <input
        id={id}
        {...props}
        className="w-full border border-[var(--bp-line-soft)] bg-[color-mix(in_oklab,var(--bp-ground-2)_70%,transparent)] px-3.5 py-3 bp-mono text-[13.5px] text-[var(--bp-ink)] outline-none transition-colors placeholder:text-[color-mix(in_oklab,var(--bp-ink-dim)_55%,transparent)] focus:border-[var(--bp-line)]"
      />
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 border border-[var(--bp-line)] bg-[color-mix(in_oklab,var(--bp-line)_14%,transparent)] px-6 py-3 bp-mono text-[12.5px] tracking-wide text-[var(--bp-ink)] transition-colors duration-200 hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {loading ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--bp-line-faint)] border-t-[var(--bp-line)]" />
          WORKING…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="border border-[color-mix(in_oklab,var(--bp-critical)_45%,transparent)] bg-[color-mix(in_oklab,var(--bp-critical)_10%,transparent)] px-3.5 py-2.5 bp-mono text-[11.5px] leading-relaxed text-[var(--bp-critical)]"
    >
      {message}
    </p>
  );
}
