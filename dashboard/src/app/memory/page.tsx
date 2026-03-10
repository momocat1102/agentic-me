'use client';

import { useEffect, useState } from 'react';
import { api, type MemoryStats } from '@/lib/api';
import { MemoryBrowser } from '@/components/MemoryBrowser';
import { MemoryGraph } from '@/components/MemoryGraph';

type ViewMode = 'graph' | 'list';

export default function MemoryPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('graph');
  const [projectFilter, setProjectFilter] = useState('');
  const [edgeTypeFilter, setEdgeTypeFilter] = useState('');

  useEffect(() => {
    api.memory
      .stats()
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const projectOptions = stats ? Object.keys(stats.projectCounts) : [];
  const edgeTypeOptions = stats?.edgeCounts ? Object.keys(stats.edgeCounts) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">記憶庫</h1>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setView('graph')}
            className={`px-4 py-1.5 text-sm transition-colors ${
              view === 'graph'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Graph
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-1.5 text-sm transition-colors ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="text-center py-4 text-gray-400 text-sm">載入統計中...</div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">總記憶數</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{stats.totalCount}</p>
          </div>
          {Object.entries(stats.projectCounts).map(([project, count]) => (
            <div key={project} className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">{project}</p>
              <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{count}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Category + Importance + Edge breakdown */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">分類</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.categoryCounts).map(([cat, count]) => (
                <span key={cat} className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                  {cat}: {count}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">重要性</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.importanceCounts).map(([imp, count]) => (
                <span key={imp} className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                  {imp}: {count}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">邊的連結</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.edgeCounts).map(([type, count]) => (
                <span key={type} className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Graph view controls */}
      {view === 'graph' && (
        <div className="flex gap-3">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">全部 Project</option>
            {projectOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={edgeTypeFilter}
            onChange={(e) => setEdgeTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">全部邊類型</option>
            {edgeTypeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {view === 'graph' ? (
        <MemoryGraph projectFilter={projectFilter || undefined} edgeTypeFilter={edgeTypeFilter || undefined} />
      ) : (
        <MemoryBrowser stats={stats || undefined} />
      )}
    </div>
  );
}
