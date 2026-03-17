'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl animate-slide-in"
      >
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <span className="text-lg font-bold text-gray-900 dark:text-white">Central Command</span>
        </div>
        <nav className="py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-2 border-blue-600 dark:border-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-transparent'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 font-mono">Agent Team Dashboard</p>
        </div>
      </div>
    </div>
  );
}
