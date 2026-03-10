'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type SystemHealth, type ServiceStatus } from '@/lib/api';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const statusDotColor: Record<ServiceStatus['status'], string> = {
  ok: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

const overallDotColor: Record<SystemHealth['status'], string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
};

const overallLabel: Record<SystemHealth['status'], string> = {
  healthy: '\u7CFB\u7D71\u5065\u5EB7',
  degraded: '\u90E8\u5206\u7570\u5E38',
  unhealthy: '\u7CFB\u7D71\u7570\u5E38',
};

function StatusDot({ status }: { status: ServiceStatus['status'] }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${statusDotColor[status]}`} />
  );
}

function ServiceCard({
  label,
  status,
  children,
}: {
  label: string;
  status: ServiceStatus;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <StatusDot status={status.status} />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
        {status.status === 'error' ? (
          <span className="text-red-500 dark:text-red-400">{status.message || 'Error'}</span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function SystemHealthPanel() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.health.check();
      setHealth(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Loading state
  if (!health && !error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 p-4">
        <div className="text-sm text-gray-400">載入系統狀態...</div>
      </div>
    );
  }

  // Error state (no cached data)
  if (error && !health) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            無法取得系統狀態
          </span>
        </div>
        <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-4">
          Server 可能未啟動
        </p>
      </div>
    );
  }

  if (!health) return null;

  const { services, agents } = health;

  return (
    <div className={`rounded-xl border ${error ? 'border-yellow-300 dark:border-yellow-700' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${overallDotColor[health.status]}`} />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {overallLabel[health.status]}
          </span>
          {error && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              資料可能過期
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          運行 {formatUptime(health.uptime)} · {health.nodeVersion}
        </div>
      </div>

      {/* Services 2x2 grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-gray-800">
        <ServiceCard label="API Server" status={services.api}>
          Port {(services.api.details?.port as number) || 4000}
        </ServiceCard>

        <ServiceCard label="WebSocket" status={services.websocket}>
          Port {(services.websocket.details?.port as number) || 4001}
          {services.websocket.details?.connectedClients !== undefined && (
            <> · {services.websocket.details.connectedClients as number} 連線</>
          )}
        </ServiceCard>

        <ServiceCard label="SQLite DB" status={services.database}>
          {services.database.details?.sizeBytes !== undefined && (
            <>{formatBytes(services.database.details.sizeBytes as number)}</>
          )}
          {services.database.details?.tableCount !== undefined && (
            <> · {services.database.details.tableCount as number} 表</>
          )}
        </ServiceCard>

        <ServiceCard label="memcp Graph DB" status={services.memcp}>
          {services.memcp.details?.nodeCount !== undefined && (
            <>
              {services.memcp.details.nodeCount as number} 節點 · {services.memcp.details.edgeCount as number} 邊
            </>
          )}
        </ServiceCard>
      </div>

      {/* Agent summary */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Agent：
          <span className="font-medium text-gray-900 dark:text-gray-200">
            {agents.online}/{agents.total}
          </span>
          {' '}在線
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          上次檢查 {formatTime(agents.lastCheckTime)}
        </div>
      </div>
    </div>
  );
}
