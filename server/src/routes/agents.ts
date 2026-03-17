import { Hono } from 'hono';
import { getDb } from '../db/schema.js';
import type { Agent } from '../types/index.js';
import { scanAgentActivity, clearActivityCache } from '../services/agent-activity.js';

const agentsRouter = new Hono();

// GET /api/agents - List all agents
agentsRouter.get('/', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM agents ORDER BY name').all() as any[];
  const agents: Agent[] = rows.map(rowToAgent);
  return c.json(agents);
});

// GET /api/agents/activity - Get real-time agent activity status
agentsRouter.get('/activity', async (c) => {
  const activities = await scanAgentActivity();
  return c.json(activities);
});

// POST /api/agents/activity/refresh - Clear cache and rescan
agentsRouter.post('/activity/refresh', async (c) => {
  clearActivityCache();
  const activities = await scanAgentActivity();
  return c.json(activities);
});

// GET /api/agents/:id - Get a single agent
agentsRouter.get('/:id', (c) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(c.req.param('id')) as any;
  if (!row) return c.json({ error: 'Agent not found' }, 404);
  return c.json(rowToAgent(row));
});

function rowToAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    path: row.path,
    isOrchestrator: !!row.is_orchestrator,
    status: row.status,
    claudeVersion: row.claude_version,
    lastHealthCheck: row.last_health_check,
  };
}

export default agentsRouter;
