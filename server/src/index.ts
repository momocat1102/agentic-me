import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { CONFIG, loadAgentsConfig } from './config.js';
import { getDb, closeDb } from './db/schema.js';
import { initWebSocket } from './services/ws-broadcaster.js';
import { startHealthChecker } from './services/health-checker.js';
import { collectSystemHealth } from './services/system-health.js';

import agentsRouter from './routes/agents.js';
import tasksRouter from './routes/tasks.js';
import eventsRouter from './routes/events.js';
import progressRouter from './routes/progress.js';
import deadlinesRouter from './routes/deadlines.js';
import memoryRouter from './routes/memory.js';
import statsRouter from './routes/stats.js';
import projectsRouter from './routes/projects.js';
import expertsRouter from './routes/experts.js';
import schedulesRouter from './routes/schedules.js';
import { initShiftScheduler } from './services/shift-scheduler.js';

import type { Agent } from './types/index.js';

const app = new Hono();

// Middleware
app.use('*', cors({ origin: '*' }));
app.use('*', logger());

// Routes
app.route('/api/agents', agentsRouter);
app.route('/api/tasks', tasksRouter);
app.route('/api/events', eventsRouter);
app.route('/api/progress', progressRouter);
app.route('/api/deadlines', deadlinesRouter);
app.route('/api/memory', memoryRouter);
app.route('/api/stats', statsRouter);
app.route('/api/projects', projectsRouter);
app.route('/api/experts', expertsRouter);
app.route('/api/schedules', schedulesRouter);

// Health endpoint
app.get('/api/health', (c) => c.json(collectSystemHealth()));

// Initialize
function init() {
  // 1. Init DB
  const db = getDb();
  console.log('[DB] SQLite initialized');

  // 2. Load agents from config and upsert into DB
  const config = loadAgentsConfig();
  const agents: Agent[] = [];

  for (const a of config.agents) {
    const existing = db.prepare('SELECT id FROM agents WHERE id = ?').get(a.id);
    if (existing) {
      db.prepare(`
        UPDATE agents SET name = ?, role = ?, path = ?, is_orchestrator = ?, updated_at = ?
        WHERE id = ?
      `).run(a.name, a.role || null, a.path, a.isOrchestrator ? 1 : 0, new Date().toISOString(), a.id);
    } else {
      db.prepare(`
        INSERT INTO agents (id, name, role, path, is_orchestrator)
        VALUES (?, ?, ?, ?, ?)
      `).run(a.id, a.name, a.role || null, a.path, a.isOrchestrator ? 1 : 0);
    }

    agents.push({
      id: a.id,
      name: a.name,
      role: a.role,
      path: a.path,
      isOrchestrator: a.isOrchestrator,
      status: 'idle',
    });
  }
  console.log(`[Config] Loaded ${agents.length} agent(s)`);

  // 3. Init WebSocket
  initWebSocket(CONFIG.wsPort);

  // 4. Start health checker
  startHealthChecker(agents, CONFIG.healthCheckIntervalMs);

  // 5. Init shift scheduler
  initShiftScheduler();

  // 6. Start HTTP server
  serve({ fetch: app.fetch, port: CONFIG.port }, (info) => {
    console.log(`[Server] Central Command running at http://localhost:${info.port}`);
    console.log(`[Server] WebSocket at ws://localhost:${CONFIG.wsPort}`);
  });
}

init();

// Graceful shutdown: flush WAL to DB file
function shutdown() {
  console.log('[Server] Shutting down...');
  try {
    const db = getDb();
    db.pragma('wal_checkpoint(TRUNCATE)');
    closeDb();
    console.log('[DB] WAL checkpoint done, DB closed');
  } catch (err) {
    console.error('[DB] Shutdown error:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
