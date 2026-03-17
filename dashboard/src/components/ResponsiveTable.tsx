'use client';

import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  /** Used as card title field (shown prominently) */
  primary?: boolean;
  /** Hidden on mobile cards */
  hideOnMobile?: boolean;
  /** Text alignment for table mode */
  align?: 'left' | 'right';
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyFn: (row: T) => string;
  emptyMessage?: string;
}

export function ResponsiveTable<T>({ columns, data, keyFn, emptyMessage }: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        {emptyMessage || '目前沒有資料'}
      </div>
    );
  }

  const visibleMobileColumns = columns.filter(c => !c.hideOnMobile);

  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-gray-500 dark:text-gray-400 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={keyFn(row)} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
        {data.map((row) => {
          const primary = visibleMobileColumns.find(c => c.primary);
          const rest = visibleMobileColumns.filter(c => !c.primary);
          return (
            <div key={keyFn(row)} className="px-4 py-3 space-y-1.5">
              {primary && (
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {primary.render(row)}
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {rest.map((col) => (
                  <div key={col.key} className="text-xs">
                    <span className="text-gray-400">{col.label}: </span>
                    <span className="text-gray-700 dark:text-gray-300">{col.render(row)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
