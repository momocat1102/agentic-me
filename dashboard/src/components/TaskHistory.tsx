'use client';

import type { Task } from '@/lib/api';

interface TaskHistoryProps {
  tasks: Task[];
  agentNames: Record<string, string>;
  projectNames?: Record<string, string>;
}

const statusStyles: Record<string, string> = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  completed: '完成',
  failed: '失敗',
};

export function TaskHistory({ tasks, agentNames, projectNames }: TaskHistoryProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        目前沒有任務紀錄
      </div>
    );
  }

  const showProject = !!projectNames;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">狀態</th>
            <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Agent</th>
            {showProject && (
              <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">專案</th>
            )}
            <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Prompt</th>
            <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">摘要</th>
            <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">完成時間</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="py-3 px-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyles[task.status] || ''}`}>
                  {statusLabels[task.status] || task.status}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                {agentNames[task.agentId] || task.agentId}
              </td>
              {showProject && (
                <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-xs">
                  {task.projectId ? (projectNames[task.projectId] || task.projectId) : '-'}
                </td>
              )}
              <td className="py-3 px-4 text-gray-700 dark:text-gray-300 max-w-[300px] truncate">
                {task.prompt}
              </td>
              <td className="py-3 px-4 text-gray-500 dark:text-gray-400 max-w-[250px] truncate">
                {task.summary || '-'}
              </td>
              <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                {task.completedAt
                  ? new Date(task.completedAt).toLocaleString('zh-TW')
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
