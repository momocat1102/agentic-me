'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type ToolUsageStat } from '@/lib/api';

const PERIODS = [
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
  { label: '全部', value: 'all' },
];

const categoryColors: Record<string, string> = {
  builtin: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  mcp: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  skill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  command: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export function ToolUsagePanel({ agentId }: { agentId: string }) {
  const [period, setPeriod] = useState('7d');
  const [usage, setUsage] = useState<ToolUsageStat[]>([]);
  const [unused, setUnused] = useState<{ tool: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usageData, unusedData] = await Promise.all([
        api.stats.toolUsage({ agentId, period }),
        api.stats.unusedTools(agentId, period),
      ]);
      setUsage(usageData);
      setUnused(unusedData);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [agentId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxCount = usage.length > 0 ? usage[0].count : 1;

  return (
    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          工具使用統計
        </h4>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">載入中...</p>
      ) : usage.length === 0 ? (
        <p className="text-xs text-gray-400">此期間無使用紀錄</p>
      ) : (
        <div className="space-y-1.5">
          {usage.map((stat) => (
            <div key={stat.toolName} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs text-gray-900 dark:text-gray-100 min-w-[160px] truncate">
                {stat.toolName}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColors[stat.category] || categoryColors.builtin}`}>
                {stat.category}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 dark:bg-blue-400 rounded-full"
                    style={{ width: `${Math.max((stat.count / maxCount) * 100, 2)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[30px] text-right">
                  {stat.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unused tools */}
      {unused.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            未使用工具
            <span className="text-xs text-gray-400 ml-1">({unused.length})</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {unused.slice(0, 20).map((u) => (
              <span
                key={u.tool}
                className="inline-block px-2 py-0.5 text-[11px] font-mono rounded bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500 line-through"
              >
                {u.tool}
              </span>
            ))}
            {unused.length > 20 && (
              <span className="text-xs text-gray-400">...+{unused.length - 20} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
