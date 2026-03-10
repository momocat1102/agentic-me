import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { getDb } from '../db/schema.js';
import { getWss } from './ws-broadcaster.js';
import { CONFIG } from '../config.js';

export interface ServiceStatus {
  status: 'ok' | 'warning' | 'error';
  message?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  nodeVersion: string;

  services: {
    api: ServiceStatus;
    websocket: ServiceStatus;
    database: ServiceStatus;
    memcp: ServiceStatus;
  };

  agents: {
    total: number;
    online: number;
    offline: number;
    lastCheckTime: string | null;
  };
}

function checkApi(): ServiceStatus {
  return {
    status: 'ok',
    details: { port: CONFIG.port },
  };
}

function checkWebSocket(): ServiceStatus {
  const wss = getWss();
  if (!wss) {
    return { status: 'error', message: 'WebSocket server not initialized' };
  }
  return {
    status: 'ok',
    details: { port: CONFIG.wsPort, connectedClients: wss.clients.size },
  };
}

function checkDatabase(): ServiceStatus {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();

    const dbPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../data/central-command.db'
    );
    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(dbPath).size;
    } catch {
      // ignore
    }

    const tables = db
      .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      .get() as { count: number };

    return {
      status: 'ok',
      details: { sizeBytes, tableCount: tables.count },
    };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Database check failed',
    };
  }
}

function checkMemcp(): ServiceStatus {
  const graphDbPath = path.join(CONFIG.memcpDataDir, 'graph.db');
  try {
    if (!fs.existsSync(graphDbPath)) {
      return { status: 'error', message: 'graph.db not found' };
    }

    const memDb = new Database(graphDbPath, { readonly: true });
    try {
      const nodes = memDb.prepare('SELECT COUNT(*) as count FROM nodes').get() as { count: number };
      const edges = memDb.prepare('SELECT COUNT(*) as count FROM edges').get() as { count: number };
      return {
        status: 'ok',
        details: { nodeCount: nodes.count, edgeCount: edges.count },
      };
    } finally {
      memDb.close();
    }
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'memcp check failed',
    };
  }
}

function checkAgents(): SystemHealth['agents'] {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT status, COUNT(*) as count FROM agents GROUP BY status")
      .all() as { status: string; count: number }[];

    let total = 0;
    let online = 0;
    for (const row of rows) {
      total += row.count;
      if (row.status === 'idle' || row.status === 'busy') {
        online += row.count;
      }
    }

    const lastCheck = db
      .prepare('SELECT MAX(last_health_check) as last_check FROM agents')
      .get() as { last_check: string | null };

    return {
      total,
      online,
      offline: total - online,
      lastCheckTime: lastCheck.last_check,
    };
  } catch {
    return { total: 0, online: 0, offline: 0, lastCheckTime: null };
  }
}

export function collectSystemHealth(): SystemHealth {
  const services = {
    api: checkApi(),
    websocket: checkWebSocket(),
    database: checkDatabase(),
    memcp: checkMemcp(),
  };

  const statuses = Object.values(services).map((s) => s.status);
  let overall: SystemHealth['status'] = 'healthy';
  if (statuses.includes('error')) overall = 'unhealthy';
  else if (statuses.includes('warning')) overall = 'degraded';

  return {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    services,
    agents: checkAgents(),
  };
}
