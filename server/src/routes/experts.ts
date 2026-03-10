import { Hono } from 'hono';
import { loadAgentsConfig } from '../config.js';

const expertsRouter = new Hono();

// GET /api/experts - List all available expert modes
expertsRouter.get('/', (c) => {
  const config = loadAgentsConfig();
  return c.json(config.experts || []);
});

export default expertsRouter;
