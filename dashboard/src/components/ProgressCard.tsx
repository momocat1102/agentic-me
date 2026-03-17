'use client';

import type { Progress } from '@/lib/api';

interface ProgressCardProps {
  item: Progress;
  children?: Progress[];
}

const statusColors: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

const statusLabels: Record<string, string> = {
  not_started: '未開始',
  in_progress: '進行中',
  draft: '草稿',
  review: '審閱中',
  completed: '已完成',
};

const progressBarColors: Record<string, string> = {
  not_started: 'bg-gray-300 dark:bg-gray-600',
  in_progress: 'bg-blue-500',
  draft: 'bg-yellow-500',
  review: 'bg-purple-500',
  completed: 'bg-green-500',
};

export function ProgressCard({ item, children }: ProgressCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.label}</h3>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status] || ''}`}>
          {statusLabels[item.status] || item.status}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{item.project}</span>
          <span>{item.progressPct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressBarColors[item.status] || 'bg-blue-500'}`}
            style={{ width: `${item.progressPct}%` }}
          />
        </div>
      </div>

      {item.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{item.description}</p>
      )}

      {/* Children */}
      {children && children.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">子項目</p>
          {children.map((child) => (
            <div key={child.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${progressBarColors[child.status] || 'bg-gray-400'}`} />
                <span className="text-gray-700 dark:text-gray-300">{child.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{child.progressPct}%</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[child.status] || ''}`}>
                  {statusLabels[child.status] || child.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        {new Date(item.updatedAt).toLocaleDateString('zh-TW')} 由 {item.updatedBy} 更新
      </p>
    </div>
  );
}
