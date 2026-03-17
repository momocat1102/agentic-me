'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MobileDrawer } from '@/components/MobileDrawer';

const NAV_ITEMS = [
  { href: '/', label: '總覽' },
  { href: '/projects', label: '專案' },
  { href: '/tasks', label: '任務紀錄' },
  { href: '/logs', label: '系統 Log' },
  { href: '/memory', label: '記憶庫' },
  { href: '/deadlines', label: '截止日' },
  { href: '/schedules', label: '排程' },
  { href: '/pixel-office', label: '辦公室' },
  { href: '/guide', label: '使用指南' },
];

export function NavHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);
  const handleClose = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4 md:gap-8">
              {/* Hamburger button - mobile only */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden p-1.5 -ml-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                aria-label="開啟選單"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
                Central Command
              </Link>

              {/* Desktop nav */}
              <nav className="hidden md:flex gap-4 text-sm">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  const showActive = mounted && isActive;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`transition-colors ${
                        showActive
                          ? 'text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="text-xs text-gray-400 font-mono hidden sm:block">
              Agent Team Dashboard
            </div>
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={handleClose} />
    </>
  );
}
