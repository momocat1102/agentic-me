'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, type LogEntry } from '@/lib/api';

const LEVEL_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevTopId = useRef<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params: { level?: string; module?: string; limit?: number } = { limit: 200 };
      if (levelFilter) params.level = levelFilter;
      if (moduleFilter) params.module = moduleFilter;
      const data = await api.logs.list(params);

      // Detect new logs
      if (prevTopId.current && data.length > 0 && data[0].id !== prevTopId.current) {
        const newIdx = data.findIndex(l => l.id === prevTopId.current);
        if (newIdx > 0) setNewCount(prev => prev + newIdx);
      }
      if (data.length > 0) prevTopId.current = data[0].id;

      setLogs(data);
    } catch {
      // Server might be offline
    } finally {
      setLoading(false);
    }
  }, [levelFilter, moduleFilter]);

  const fetchModules = useCallback(async () => {
    try {
      const data = await api.logs.modules();
      setModules(data);
    } catch {
      // ignore
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
    fetchModules();
  }, [fetchLogs, fetchModules]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Reset new count when filters change
  useEffect(() => {
    setNewCount(0);
    prevTopId.current = null;
  }, [levelFilter, moduleFilter]);

  const formatTime = (ts: string) => {
    const d = new Date(ts + 'Z');
    return d.toLocaleString('zh-TW', { hour12: false });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">系統 Log</h1>
        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <button
              onClick={() => { setNewCount(0); fetchLogs(); }}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-full animate-pulse"
            >
              {newCount} 筆新 Log
            </button>
          )}
          <div className="text-xs text-gray-400">每 10 秒自動刷新</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">全部等級</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">全部模組</option>
          {modules.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">尚無 Log 記錄</div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400 w-44">時間</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400 w-20">等級</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400 w-28">模組</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">訊息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">
                    {formatTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[log.level] || ''}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-mono text-xs">
                    {log.module}
                  </td>
                  <td className="px-4 py-2 text-gray-900 dark:text-white">
                    <div>{log.message}</div>
                    {expandedId === log.id && log.data && (
                      <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                        {JSON.stringify(JSON.parse(log.data), null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
