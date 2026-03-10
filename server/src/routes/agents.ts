import { Hono } from 'hono';
import { getDb } from '../db/schema.js';
import type { Agent } from '../types/index.js';
import { scanAgentCapabilities } from '../services/capability-scanner.js';

const agentsRouter = new Hono();

// GET /api/agents - List all agents
agentsRouter.get('/', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM agents ORDER BY name').all() as any[];
  const agents: Agent[] = rows.map(rowToAgent);
  return c.json(agents);
});

// GET /api/agents/capabilities - Scan all agents capabilities
// Must be before /:id to avoid being caught by the param route
agentsRouter.get('/capabilities', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM agents ORDER BY name').all() as any[];
  const results = rows.map((row: any) => {
    const agent = rowToAgent(row);
    return scanAgentCapabilities(agent.id, agent.path);
  });
  return c.json(results);
});

// GET /api/agents/:id - Get a single agent
agentsRouter.get('/:id', (c) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(c.req.param('id')) as any;
  if (!row) return c.json({ error: 'Agent not found' }, 404);
  return c.json(rowToAgent(row));
});

// GET /api/agents/:id/capabilities - Scan single agent capabilities
agentsRouter.get('/:id/capabilities', (c) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(c.req.param('id')) as any;
  if (!row) return c.json({ error: 'Agent not found' }, 404);
  const agent = rowToAgent(row);
  return c.json(scanAgentCapabilities(agent.id, agent.path));
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
