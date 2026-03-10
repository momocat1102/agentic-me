'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type MemoryEntry, type MemoryStats } from '@/lib/api';

const PAGE_SIZE = 20;

const IMPORTANCE_BADGES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function MemoryBrowser({ stats }: { stats?: MemoryStats }) {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const loadEntries = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const newOffset = reset ? 0 : offset;
      const params: { project?: string; category?: string; limit?: number; offset?: number } = {
        limit: PAGE_SIZE,
        offset: newOffset,
      };
      if (projectFilter) params.project = projectFilter;
      if (categoryFilter) params.category = categoryFilter;

      const data = await api.memory.list(params);
      if (reset) {
        setEntries(data);
        setOffset(PAGE_SIZE);
      } else {
        setEntries((prev) => [...prev, ...data]);
        setOffset(newOffset + PAGE_SIZE);
      }
      setHasMore(data.length === PAGE_SIZE);
      setIsSearching(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [offset, projectFilter, categoryFilter]);

  const doSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadEntries(true);
      return;
    }
    setLoading(true);
    setIsSearching(true);
    try {
      const data = await api.memory.search(searchQuery.trim(), 50);
      setEntries(data);
      setHasMore(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchQuery, loadEntries]);

  useEffect(() => {
    loadEntries(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch();
  };

  const projectOptions = stats ? Object.keys(stats.projectCounts) : [];
  const categoryOptions = stats ? Object.keys(stats.categoryCounts) : [];

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋記憶..."
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            搜尋
          </button>
        </form>

        <select
          value={projectFilter}
          onChange={(e) => { setProjectFilter(e.target.value); setSearchQuery(''); }}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">全部 Project</option>
          {projectOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setSearchQuery(''); }}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">全部 Category</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Memory list */}
      {loading && entries.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">載入中...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">沒有找到記憶</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-700"
            >
              <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">{entry.content}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded ${IMPORTANCE_BADGES[entry.importance] || IMPORTANCE_BADGES.medium}`}>
                  {entry.importance}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  {entry.category}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {entry.project}
                </span>
                {entry.entities.length > 0 && (
                  <span className="text-gray-400">
                    entities: {entry.entities.join(', ')}
                  </span>
                )}
                <span className="text-gray-400 ml-auto">
                  {new Date(entry.created_at).toLocaleDateString('zh-TW')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && !isSearching && (
        <div className="text-center">
          <button
            onClick={() => loadEntries(false)}
            disabled={loading}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
          >
            {loading ? '載入中...' : '載入更多'}
          </button>
        </div>
      )}
    </div>
  );
}
