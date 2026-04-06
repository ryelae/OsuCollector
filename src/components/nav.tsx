'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const links = [
  {
    href: '/uploads',
    label: 'Uploads',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    href: '/compare',
    label: 'Compare',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    href: '/merge',
    label: 'Merge & Export',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
];

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [dark, setDark] = useState(true); // default dark; corrected on mount

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    setDark(!stored || stored === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col min-h-screen dark:bg-slate-800 dark:border-slate-700">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-700"
      >
        <span className="text-2xl" role="img" aria-label="osu! logo">
          ⭕
        </span>
        <div>
          <div className="font-bold text-sm text-slate-900 leading-tight dark:text-slate-100">Collection Hub</div>
          <div className="text-[11px] text-slate-400 leading-tight dark:text-slate-500">osu! stable</div>
        </div>
      </Link>

      {/* Nav links */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {links.map((link) => {
          const active =
            link.href === '/'
              ? pathname === '/'
              : pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 dark:bg-[#2d0a18] dark:text-[#ff6699]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
              )}
            >
              <span className={active ? 'text-brand-500' : 'text-slate-400 dark:text-slate-500'}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — theme toggle */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">Private · {new Date().getFullYear()}</span>
        <button
          onClick={toggleTheme}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium
                     bg-slate-100 border border-slate-200 text-slate-500
                     hover:bg-slate-200 transition-colors
                     dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-600"
        >
          {dark ? <SunIcon /> : <MoonIcon />}
          {dark ? 'Light' : 'Dark'}
        </button>
      </div>
    </aside>
  );
}
