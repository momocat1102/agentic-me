'use client';

import type { Deadline } from '@/lib/api';

interface DeadlineListProps {
  deadlines: Deadline[];
  onMarkComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const categoryColors: Record<string, string> = {
  paper: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  meeting: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  report: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const categoryLabels: Record<string, string> = {
  paper: '論文',
  meeting: '會議',
  report: '報告',
  other: '其他',
};

function getDaysUntil(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCountdown(days: number): string {
  if (days < 0) return `已過期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天截止';
  if (days === 1) return '明天截止';
  return `剩餘 ${days} 天`;
}

export function DeadlineList({ deadlines, onMarkComplete, onDelete, compact = false }: DeadlineListProps) {
  if (deadlines.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        目前沒有截止日
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deadlines.map((d) => {
        const days = getDaysUntil(d.dueDate);
        const isOverdue = d.status === 'overdue' || (d.status !== 'completed' && days < 0);
        const isCompleted = d.status === 'completed';

        return (
          <div
            key={d.id}
            className={`rounded-xl border p-4 shadow-sm transition-shadow ${
              isOverdue
                ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950'
                : isCompleted
                  ? 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 opacity-60'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium text-gray-900 dark:text-gray-100 ${isCompleted ? 'line-through' : ''}`}>
                    {d.title}
                  </h4>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryColors[d.category] || categoryColors.other}`}>
                    {categoryLabels[d.category] || d.category}
                  </span>
                  {d.isRecurring && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
                      循環
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {new Date(d.dueDate).toLocaleDateString('zh-TW')}
                  </span>
                  <span
                    className={`font-medium ${
                      isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : days <= 3
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {isCompleted ? '已完成' : formatCountdown(days)}
                  </span>
                </div>

                {!compact && d.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{d.description}</p>
                )}

                {!compact && d.relatedProject && (
                  <p className="text-xs text-gray-400 mt-1">專案: {d.relatedProject}</p>
                )}
              </div>

              {!compact && (onMarkComplete || onDelete) && (
                <div className="flex items-center gap-2 shrink-0">
                  {onMarkComplete && !isCompleted && (
                    <button
                      onClick={() => onMarkComplete(d.id)}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      完成
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(d.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      刪除
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
