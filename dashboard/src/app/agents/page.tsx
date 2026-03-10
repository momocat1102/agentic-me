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

const categoryLabels: Record<string, string> = {
  builtin: '內建',
  mcp: 'MCP',
  skill: 'Skill',
  command: 'Command',
};

type FilterCategory = 'all' | 'builtin' | 'mcp' | 'skill' | 'command';

export default function ToolMonitorPage() {
  const [period, setPeriod] = useState('7d');
  const [usage, setUsage] = useState<ToolUsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterCategory>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.stats.toolUsage({ period });
      setUsage(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-red-500 text-lg">連線失敗</div>
        <p className="text-gray-500 text-xs font-mono">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          重試
        </button>
      </div>
    );
  }

  // Stats
  const totalCalls = usage.reduce((s, u) => s + u.count, 0);
  const uniqueTools = usage.length;
  const mcpCount = usage.filter(u => u.category === 'mcp').length;
  const builtinCount = usage.filter(u => u.category === 'builtin').length;

  // Filtered
  const filtered = filter === 'all' ? usage : usage.filter(u => u.category === filter);
  const maxCount = filtered.length > 0 ? filtered[0].count : 1;

  // Category counts for filter badges
  const categoryCounts: Record<string, number> = {};
  for (const u of usage) {
    categoryCounts[u.category] = (categoryCounts[u.category] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">工具監控</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  period === p.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            重新整理
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="總呼叫次數" value={totalCalls} color="blue" />
        <StatCard label="不重複工具" value={uniqueTools} color="green" />
        <StatCard label="MCP 工具" value={mcpCount} color="purple" />
        <StatCard label="內建工具" value={builtinCount} color="gray" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400 text-lg">載入中...</div>
        </div>
      ) : usage.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <div className="text-gray-400 text-lg">此期間無使用紀錄</div>
          <p className="text-gray-500 text-sm">工具使用資料由 PostToolUse hook 自動收集</p>
        </div>
      ) : (
        <>
          {/* Category Filter */}
          <div className="flex gap-2">
            <FilterButton
              label="全部"
              count={usage.length}
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <FilterButton
                key={cat}
                label={categoryLabels[cat] || cat}
                count={count}
                active={filter === cat}
                onClick={() => setFilter(cat as FilterCategory)}
              />
            ))}
          </div>

          {/* Usage Chart */}
          <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                使用頻率
                <span className="text-xs text-gray-400 ml-2">({filtered.length} 個工具)</span>
              </h2>
            </div>
            <div className="px-5 py-3 space-y-1.5 max-h-[500px] overflow-y-auto">
              {filtered.map((stat) => (
                <div key={stat.toolName} className="flex items-center gap-2 text-sm group">
                  <span className="font-mono text-xs text-gray-900 dark:text-gray-100 min-w-[180px] truncate" title={stat.toolName}>
                    {formatToolName(stat.toolName)}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${categoryColors[stat.category] || categoryColors.builtin}`}>
                    {categoryLabels[stat.category] || stat.category}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getBarColor(stat.category)}`}
                        style={{ width: `${Math.max((stat.count / maxCount) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px] text-right font-mono">
                      {stat.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Table */}
          <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">詳細紀錄</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
                    <th className="px-5 py-2 font-medium text-gray-500 dark:text-gray-400">工具名稱</th>
                    <th className="px-5 py-2 font-medium text-gray-500 dark:text-gray-400">分類</th>
                    <th className="px-5 py-2 font-medium text-gray-500 dark:text-gray-400 text-right">呼叫次數</th>
                    <th className="px-5 py-2 font-medium text-gray-500 dark:text-gray-400 text-right">最後使用</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.map((stat) => (
                    <tr key={stat.toolName} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-2 font-mono text-xs text-gray-900 dark:text-gray-100">
                        {formatToolName(stat.toolName)}
                      </td>
                      <td className="px-5 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColors[stat.category] || categoryColors.builtin}`}>
                          {categoryLabels[stat.category] || stat.category}
                        </span>
                      </td>
                      <td className="px-5 py-2 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                        {stat.count}
                      </td>
                      <td className="px-5 py-2 text-right text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(stat.lastUsed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatToolName(name: string): string {
  if (name.startsWith('mcp__')) {
    const parts = name.split('__');
    return parts.length >= 3 ? `${parts[1]}/${parts.slice(2).join('__')}` : name;
  }
  if (name.startsWith('skill:')) {
    return `/${name.slice(6)}`;
  }
  return name;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '剛才';
    if (diffMin < 60) return `${diffMin} 分鐘前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} 小時前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} 天前`;
    return d.toLocaleDateString('zh-TW');
  } catch {
    return iso;
  }
}

function getBarColor(category: string): string {
  switch (category) {
    case 'mcp': return 'bg-purple-500 dark:bg-purple-400';
    case 'skill': return 'bg-blue-500 dark:bg-blue-400';
    case 'command': return 'bg-green-500 dark:bg-green-400';
    default: return 'bg-gray-400 dark:bg-gray-500';
  }
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const textColor =
    color === 'blue' ? 'text-blue-600 dark:text-blue-400'
      : color === 'green' ? 'text-green-600 dark:text-green-400'
        : color === 'purple' ? 'text-purple-600 dark:text-purple-400'
          : 'text-gray-600 dark:text-gray-400';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textColor}`}>{value}</p>
    </div>
  );
}

function FilterButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
      }`}
    >
      {label}
      <span className={`text-[10px] ${active ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
        {count}
      </span>
    </button>
  );
}
