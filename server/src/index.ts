import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

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
import projectsRouter from './routes/projects.js';
import logsRouter from './routes/logs.js';
import schedulesRouter from './routes/schedules.js';
import discordWebhooksRouter from './routes/discord-webhooks.js';

import { logger } from './services/logger.js';
import { initShiftScheduler } from './services/shift-scheduler.js';
import { startActivityScanner, stopActivityScanner } from './services/agent-activity.js';

import type { Agent } from './types/index.js';

const app = new Hono();

// Middleware
app.use('*', cors({ origin: '*' }));
app.use('*', honoLogger());

// Routes
app.route('/api/agents', agentsRouter);
app.route('/api/tasks', tasksRouter);
app.route('/api/events', eventsRouter);
app.route('/api/progress', progressRouter);
app.route('/api/deadlines', deadlinesRouter);
app.route('/api/memory', memoryRouter);
app.route('/api/projects', projectsRouter);
app.route('/api/logs', logsRouter);
app.route('/api/schedules', schedulesRouter);
app.route('/api/discord-webhooks', discordWebhooksRouter);


// Health endpoint
app.get('/api/health', (c) => c.json(collectSystemHealth()));

// Initialize
function init() {
  // 1. Init DB
  const db = getDb();
  logger.info('db', 'SQLite initialized');

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
  logger.info('server', `Loaded ${agents.length} agent(s)`);

  // 3. Init WebSocket
  initWebSocket(CONFIG.wsPort);

  // 4. Start health checker
  startHealthChecker(agents, CONFIG.healthCheckIntervalMs);

  // 5. Init shift scheduler
  initShiftScheduler();

  // 6. Start agent activity scanner
  startActivityScanner();

  // 7. Start HTTP server
  serve({ fetch: app.fetch, port: CONFIG.port }, (info) => {
    logger.info('server', `Central Command running at http://localhost:${info.port}`);
    logger.info('server', `WebSocket at ws://localhost:${CONFIG.wsPort}`);
  });
}

init();

// Graceful shutdown: flush WAL to DB file
function shutdown() {
  logger.info('server', 'Shutting down...');
  stopActivityScanner();
  try {
    const db = getDb();
    db.pragma('wal_checkpoint(TRUNCATE)');
    closeDb();
    console.log('[DB] WAL checkpoint done, DB closed'); // Use console here since DB is closed
  } catch (err) {
    console.error('[DB] Shutdown error:', err); // Use console here since DB may be closed
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
