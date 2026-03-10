import { Hono } from 'hono';
import { getDb } from '../db/schema.js';
import { getToolUsageByAgent, getToolUsageGlobal, getAgentUsageSummary, getUnusedTools } from '../services/stats.js';
import type { Agent } from '../types/index.js';

const statsRouter = new Hono();

// GET /api/stats/tool-usage?agentId=xxx&period=7d
statsRouter.get('/tool-usage', (c) => {
  const agentId = c.req.query('agentId');
  const period = c.req.query('period') || '7d';

  if (agentId) {
    return c.json(getToolUsageByAgent(agentId, period));
  }
  return c.json(getToolUsageGlobal(period));
});

// GET /api/stats/agent-summary?period=7d
statsRouter.get('/agent-summary', (c) => {
  const period = c.req.query('period') || '7d';
  return c.json(getAgentUsageSummary(period));
});

// GET /api/stats/unused-tools?agentId=xxx&period=7d
statsRouter.get('/unused-tools', (c) => {
  const agentId = c.req.query('agentId');
  if (!agentId) {
    return c.json({ error: 'agentId is required' }, 400);
  }

  const period = c.req.query('period') || '7d';

  const db = getDb();
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any;
  if (!row) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json(getUnusedTools(agentId, row.path, period));
});

export default statsRouter;
