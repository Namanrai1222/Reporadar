'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, History, FolderOpen, Settings, ChevronRight } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Radar, label: 'New Scan' },
  { href: '/history', icon: History, label: 'Scan History' },
  { href: '/reports', icon: FolderOpen, label: 'Saved Reports' },
];

export function GlobalRail() {
  const pathname = usePathname();

  return (
    <nav className="w-[220px] shrink-0 h-screen sticky top-0 border-r border-[#364047] bg-[#181D20] hidden md:flex md:flex-col z-10">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5 border-b border-[#364047]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#63D7D1] to-[#3BA8A3] flex items-center justify-center">
          <Radar className="w-4 h-4 text-[#111416]" />
        </div>
        <span className="text-[15px] font-semibold text-[#F2F4F0] tracking-tight">RepoRadar</span>
      </div>

      {/* Nav Items */}
      <div className="flex-1 flex flex-col gap-0.5 p-3 pt-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group ${
                active
                  ? 'bg-[#22292D] text-[#F2F4F0] font-medium'
                  : 'text-[#A9B3B8] hover:bg-[#22292D] hover:text-[#F2F4F0]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#63D7D1]' : 'text-[#A9B3B8] group-hover:text-[#63D7D1]'}`} />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-[#364047]" />}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#364047]">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-[#A9B3B8] hover:bg-[#22292D] hover:text-[#F2F4F0] transition-all duration-150 group"
        >
          <Settings className="w-4 h-4 shrink-0 group-hover:text-[#63D7D1]" />
          Settings
        </Link>
        <div className="px-3 py-2 mt-1">
          <p className="text-[11px] text-[#364047] font-mono">v0.1.0 · MVP</p>
        </div>
      </div>
    </nav>
  );
}
