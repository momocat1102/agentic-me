import { Hono } from 'hono';
import { getEventsByTask, getEventsByAgent, getRecentEvents, insertEvent } from '../services/event-store.js';
import type { EventType } from '../types/index.js';

const VALID_EVENT_TYPES: EventType[] = ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop', 'SessionEnd'];

const eventsRouter = new Hono();

// GET /api/events - List recent events
eventsRouter.get('/', (c) => {
  const taskId = c.req.query('taskId');
  const agentId = c.req.query('agentId');
  const limit = parseInt(c.req.query('limit') || '50', 10);

  if (taskId) {
    return c.json(getEventsByTask(taskId, limit));
  }
  if (agentId) {
    return c.json(getEventsByAgent(agentId, limit));
  }
  return c.json(getRecentEvents(limit));
});

// POST /api/events - Record an event (from hooks)
eventsRouter.post('/', async (c) => {
  const body = await c.req.json();

  if (!body.agentId || !body.eventType) {
    return c.json({ error: 'agentId and eventType are required' }, 400);
  }
  if (!VALID_EVENT_TYPES.includes(body.eventType)) {
    return c.json({ error: `eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}` }, 400);
  }

  const event = insertEvent({
    agentId: body.agentId,
    sessionId: body.sessionId,
    eventType: body.eventType,
    toolName: body.toolName,
    data: body.data,
  });

  return c.json(event, 201);
});

export default eventsRouter;
