import { Hono } from 'hono';
import { recordTask, getTask, listTasks, updateTask, deleteTask } from '../services/task-recorder.js';
import { logger } from '../services/logger.js';
import type { RecordTaskInput } from '../types/index.js';

const tasksRouter = new Hono();

// GET /api/tasks - List task history
tasksRouter.get('/', (c) => {
  const agentId = c.req.query('agentId');
  const project = c.req.query('project');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const tasks = listTasks(agentId || undefined, project || undefined, limit);
  return c.json(tasks);
});

// GET /api/tasks/:id - Get a single task
tasksRouter.get('/:id', (c) => {
  const task = getTask(c.req.param('id'));
  if (!task) return c.json({ error: 'Task not found' }, 404);
  return c.json(task);
});

// POST /api/tasks - Record a completed task (from MCP / Main Agent)
tasksRouter.post('/', async (c) => {
  const body = await c.req.json<RecordTaskInput>();

  if (!body.agentId || !body.prompt || !body.summary) {
    return c.json({ error: 'agentId, prompt, and summary are required' }, 400);
  }

  const task = recordTask(body);
  logger.info('tasks', `Task recorded: ${body.summary}`, { agentId: body.agentId, projectId: body.projectId });
  return c.json(task, 201);
});

// PUT /api/tasks/:id - Update a task
tasksRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const task = updateTask(id, body);
  if (!task) return c.json({ error: 'Task not found' }, 404);
  return c.json(task);
});

// DELETE /api/tasks/:id - Delete a task
tasksRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const deleted = deleteTask(id);
  if (!deleted) return c.json({ error: 'Task not found' }, 404);
  return c.json({ ok: true });
});

export default tasksRouter;
