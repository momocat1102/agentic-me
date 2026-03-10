import { Hono } from 'hono';
import { getDb } from '../db/schema.js';
import { broadcast } from '../services/ws-broadcaster.js';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../types/index.js';

const projectsRouter = new Hono();

function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/projects - List all projects with stats
projectsRouter.get('/', (c) => {
  const db = getDb();
  const status = c.req.query('status');

  let rows: any[];
  if (status) {
    rows = db.prepare('SELECT * FROM projects WHERE status = ? ORDER BY created_at').all(status);
  } else {
    rows = db.prepare('SELECT * FROM projects ORDER BY created_at').all();
  }

  const projects = rows.map((row) => {
    const project = rowToProject(row);

    // Task stats
    const taskStats = db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks WHERE project_id = ?
    `).get(project.id) as any;

    // Participating agents
    const agentRows = db.prepare(`
      SELECT DISTINCT agent_id FROM tasks WHERE project_id = ?
    `).all(project.id) as any[];

    // Progress (top-level item)
    const progressRow = db.prepare(`
      SELECT progress_pct FROM progress WHERE project = ? AND parent_id IS NULL LIMIT 1
    `).get(project.id) as any;

    return {
      ...project,
      taskCount: taskStats?.total || 0,
      completedTaskCount: taskStats?.completed || 0,
      progressPct: progressRow?.progress_pct ?? 0,
      participatingAgents: agentRows.map((r: any) => r.agent_id),
    };
  });

  return c.json(projects);
});

// GET /api/projects/:id - Get single project
projectsRouter.get('/:id', (c) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(c.req.param('id')) as any;
  if (!row) return c.json({ error: 'Project not found' }, 404);
  return c.json(rowToProject(row));
});

// GET /api/projects/:id/summary - Full project summary
projectsRouter.get('/:id/summary', (c) => {
  const db = getDb();
  const id = c.req.param('id');

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!row) return c.json({ error: 'Project not found' }, 404);

  // Tasks grouped by agent
  const tasksByAgent = db.prepare(`
    SELECT agent_id, COUNT(*) as task_count,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM tasks WHERE project_id = ? GROUP BY agent_id
  `).all(id);

  // Recent tasks
  const recentTasks = db.prepare(`
    SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(id);

  // Progress items
  const progressItems = db.prepare(`
    SELECT * FROM progress WHERE project = ? ORDER BY sort_order, created_at
  `).all(id);

  // Deadlines
  const deadlines = db.prepare(`
    SELECT * FROM deadlines WHERE related_project = ? ORDER BY due_date
  `).all(id);

  return c.json({
    project: rowToProject(row),
    tasksByAgent,
    recentTasks,
    progressItems,
    deadlines,
  });
});

// POST /api/projects - Create new project
projectsRouter.post('/', async (c) => {
  const body = await c.req.json<CreateProjectInput>();
  if (!body.id || !body.name) {
    return c.json({ error: 'id and name are required' }, 400);
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(body.id);
  if (existing) {
    return c.json({ error: 'Project already exists' }, 409);
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (id, name, description, status, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?)
  `).run(body.id, body.name, body.description || null, now, now);

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(body.id) as any;
  const project = rowToProject(row);
  broadcast('project_update', project);
  return c.json(project, 201);
});

// PUT /api/projects/:id - Update project
projectsRouter.put('/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Project not found' }, 404);

  const body = await c.req.json<UpdateProjectInput>();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE projects SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ?
  `).run(
    body.name ?? null,
    body.description ?? null,
    body.status ?? null,
    now, id
  );

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  const project = rowToProject(row);
  broadcast('project_update', project);
  return c.json(project);
});

// DELETE /api/projects/:id - Delete project and related data
projectsRouter.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Project not found' }, 404);

  // Delete related data
  db.prepare('DELETE FROM tasks WHERE project_id = ?').run(id);
  db.prepare('DELETE FROM progress WHERE project = ?').run(id);
  db.prepare('DELETE FROM deadlines WHERE related_project = ?').run(id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);

  broadcast('project_update', { id, deleted: true });
  return c.json({ ok: true, deleted: id });
});

export default projectsRouter;
