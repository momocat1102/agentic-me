import { Hono } from 'hono';
import { listMemories, searchMemories, getMemoryStats, getMemoryGraph } from '../services/memory-browser.js';

const memoryRouter = new Hono();

// GET /api/memory - List memories
memoryRouter.get('/', async (c) => {
  const project = c.req.query('project');
  const category = c.req.query('category');
  const importance = c.req.query('importance');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  try {
    const memories = listMemories(project || undefined, category || undefined, importance || undefined, limit, offset);
    return c.json(memories);
  } catch (err: any) {
    return c.json({ error: 'Failed to read memory database', detail: err.message }, 500);
  }
});

// GET /api/memory/search - Search memories
memoryRouter.get('/search', async (c) => {
  const q = c.req.query('q');
  if (!q) return c.json({ error: 'q parameter is required' }, 400);

  const limit = parseInt(c.req.query('limit') || '20', 10);

  try {
    const results = searchMemories(q, limit);
    return c.json(results);
  } catch (err: any) {
    return c.json({ error: 'Search failed', detail: err.message }, 500);
  }
});

// GET /api/memory/stats - Memory statistics
memoryRouter.get('/stats', async (c) => {
  try {
    const stats = getMemoryStats();
    return c.json(stats);
  } catch (err: any) {
    return c.json({ error: 'Failed to get stats', detail: err.message }, 500);
  }
});

// GET /api/memory/graph - Graph data (nodes + edges)
memoryRouter.get('/graph', async (c) => {
  const project = c.req.query('project');

  try {
    const graph = getMemoryGraph(project || undefined);
    return c.json(graph);
  } catch (err: any) {
    return c.json({ error: 'Failed to get graph', detail: err.message }, 500);
  }
});

export default memoryRouter;
