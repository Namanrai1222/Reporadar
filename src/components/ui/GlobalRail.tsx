'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, History, FolderOpen, Settings } from 'lucide-react';
import { RepoRadarLogo } from '@/components/brand/RepoRadarLogo';

const navItems = [
  { href: '/dashboard', icon: Radar, label: 'New Scan', code: '01' },
  { href: '/history', icon: History, label: 'Scan History', code: '02' },
  { href: '/reports', icon: FolderOpen, label: 'Saved Reports', code: '03' },
];

export function GlobalRail() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* ── desktop rail ── */}
      <nav className="sticky top-0 z-10 hidden h-screen w-[232px] shrink-0 flex-col border-r border-[var(--bp-line-faint)] bg-[var(--bp-ground-2)] md:flex">
        <div className="flex items-center border-b border-[var(--bp-line-faint)] px-5 py-5">
          <Link href="/" aria-label="RepoRadar home">
            <RepoRadarLogo size={28} wordClassName="text-[14px]" />
          </Link>
        </div>

        <div className="flex flex-1 flex-col gap-px p-3 pt-4">
          <p className="bp-label mb-2 px-2">Navigation</p>
          {navItems.map(({ href, icon: Icon, label, code }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 bp-mono text-[12.5px] transition-colors duration-200 ${
                  active
                    ? 'bg-[color-mix(in_oklab,var(--bp-line)_10%,transparent)] text-[var(--bp-ink)]'
                    : 'text-[var(--bp-ink-dim)] hover:bg-[color-mix(in_oklab,var(--bp-line)_6%,transparent)] hover:text-[var(--bp-ink)]'
                }`}
              >
                {active && <span className="absolute inset-y-0 left-0 w-[2px] bg-[var(--bp-line)]" />}
                <span className="text-[10px] text-[var(--bp-line)]">{code}</span>
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--bp-line)]' : 'text-[var(--bp-ink-dim)] group-hover:text-[var(--bp-line)]'}`}
                  strokeWidth={1.5}
                />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="border-t border-[var(--bp-line-faint)] p-3">
          <Link
            href="/settings"
            className="group flex items-center gap-3 px-3 py-2.5 bp-mono text-[12.5px] text-[var(--bp-ink-dim)] transition-colors duration-200 hover:text-[var(--bp-ink)]"
          >
            <Settings className="h-4 w-4 shrink-0 group-hover:text-[var(--bp-line)]" strokeWidth={1.5} />
            Settings
          </Link>
          <p className="px-3 pt-3 bp-label">v0.1.0 · REV A</p>
        </div>
      </nav>

      {/* ── mobile top bar ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground)_92%,transparent)] px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/" aria-label="RepoRadar home">
          <RepoRadarLogo size={24} wordClassName="text-[13px]" />
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="grid h-9 w-9 place-items-center border border-[var(--bp-line-faint)] text-[var(--bp-ink-dim)]"
        >
          <Settings className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </header>

      {/* ── mobile bottom tab bar ── */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-[var(--bp-line-faint)] bg-[color-mix(in_oklab,var(--bp-ground-2)_96%,transparent)] backdrop-blur-md md:hidden"
      >
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 bp-mono text-[10px] tracking-wide transition-colors ${
                active ? 'text-[var(--bp-ink)]' : 'text-[var(--bp-ink-dim)]'
              }`}
            >
              {active && <span className="absolute inset-x-5 top-0 h-[2px] bg-[var(--bp-line)]" />}
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-[var(--bp-line)]' : ''}`} strokeWidth={1.5} />
              {label.replace('Scan ', '').replace('Saved ', '')}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
