'use client';

import type { Agent } from '@/lib/api';

const statusColors: Record<string, string> = {
  idle: 'bg-green-500',
  offline: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  idle: '閒置',
  offline: '離線',
};

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{agent.name}</h3>
          {agent.isOrchestrator && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs dark:bg-purple-900 dark:text-purple-300">
              中控
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColors[agent.status] || 'bg-gray-400'}`} />
          <span className="text-sm text-gray-500 dark:text-gray-400">{statusLabels[agent.status] || agent.status}</span>
        </div>
      </div>

      {agent.role && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{agent.role}</p>
      )}

      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
        {agent.claudeVersion && (
          <div className="flex justify-between">
            <span>Claude 版本</span>
            <span className="font-mono text-xs">{agent.claudeVersion}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>路徑</span>
          <span className="font-mono text-xs truncate max-w-[200px]">{agent.path}</span>
        </div>
      </div>

      {agent.lastHealthCheck && (
        <p className="text-xs text-gray-400 mt-3">
          上次檢查: {new Date(agent.lastHealthCheck).toLocaleTimeString('zh-TW')}
        </p>
      )}
    </div>
  );
}
