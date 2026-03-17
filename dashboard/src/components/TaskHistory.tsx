'use client';

import type { Task } from '@/lib/api';
import { ResponsiveTable, type Column } from './ResponsiveTable';

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
  const showProject = !!projectNames;

  const columns: Column<Task>[] = [
    {
      key: 'status',
      label: '狀態',
      render: (t) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyles[t.status] || ''}`}>
          {statusLabels[t.status] || t.status}
        </span>
      ),
    },
    {
      key: 'agent',
      label: 'Agent',
      render: (t) => <span className="text-gray-900 dark:text-gray-100">{agentNames[t.agentId] || t.agentId}</span>,
    },
    ...(showProject ? [{
      key: 'project',
      label: '專案',
      render: (t: Task) => (
        <span className="text-gray-600 dark:text-gray-300 text-xs">
          {t.projectId ? (projectNames![t.projectId] || t.projectId) : '-'}
        </span>
      ),
    }] : []),
    {
      key: 'prompt',
      label: 'Prompt',
      primary: true,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300 max-w-[300px] truncate block">
          {t.prompt}
        </span>
      ),
    },
    {
      key: 'summary',
      label: '摘要',
      hideOnMobile: true,
      render: (t) => (
        <span className="text-gray-500 dark:text-gray-400 max-w-[250px] truncate block">
          {t.summary || '-'}
        </span>
      ),
    },
    {
      key: 'completedAt',
      label: '完成時間',
      render: (t) => (
        <span className="text-gray-400 text-xs whitespace-nowrap">
          {t.completedAt ? new Date(t.completedAt).toLocaleString('zh-TW') : '-'}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={tasks}
      keyFn={(t) => t.id}
      emptyMessage="目前沒有任務紀錄"
    />
  );
}
