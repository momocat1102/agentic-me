import { Hono } from 'hono';
import { getDb } from '../db/schema.js';
import { broadcast } from '../services/ws-broadcaster.js';
import type { CreateProgressInput, UpdateProgressInput, Progress } from '../types/index.js';
import crypto from 'crypto';

const progressRouter = new Hono();

function rowToProgress(row: any): Progress {
  return {
    id: row.id,
    project: row.project,
    label: row.label,
    category: row.category,
    status: row.status,
    progressPct: row.progress_pct,
    description: row.description,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
  };
}

// GET /api/progress
progressRouter.get('/', (c) => {
  const db = getDb();
  const project = c.req.query('project');

  let rows: any[];
  if (project) {
    rows = db.prepare('SELECT * FROM progress WHERE project = ? ORDER BY sort_order, created_at').all(project);
  } else {
    rows = db.prepare('SELECT * FROM progress ORDER BY sort_order, created_at').all();
  }

  return c.json(rows.map(rowToProgress));
});

// GET /api/progress/:id
progressRouter.get('/:id', (c) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM progress WHERE id = ?').get(c.req.param('id')) as any;
  if (!row) return c.json({ error: 'Progress not found' }, 404);
  return c.json(rowToProgress(row));
});

// POST /api/progress
progressRouter.post('/', async (c) => {
  const body = await c.req.json<CreateProgressInput>();
  if (!body.project || !body.label) {
    return c.json({ error: 'project and label are required' }, 400);
  }

  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO progress (id, project, label, category, status, progress_pct, description, parent_id, sort_order, updated_at, updated_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)
  `).run(
    id, body.project, body.label,
    body.category || 'project',
    body.status || 'not_started',
    body.progressPct ?? 0,
    body.description || null,
    body.parentId || null,
    body.sortOrder ?? 0,
    now, now
  );

  const row = db.prepare('SELECT * FROM progress WHERE id = ?').get(id) as any;
  const progress = rowToProgress(row);
  broadcast('progress_update', progress);
  return c.json(progress, 201);
});

// PUT /api/progress/:id
progressRouter.put('/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM progress WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Progress not found' }, 404);

  const body = await c.req.json<UpdateProgressInput>();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE progress SET
      label = COALESCE(?, label),
      status = COALESCE(?, status),
      progress_pct = COALESCE(?, progress_pct),
      description = COALESCE(?, description),
      sort_order = COALESCE(?, sort_order),
      updated_at = ?,
      updated_by = 'manual'
    WHERE id = ?
  `).run(
    body.label ?? null,
    body.status ?? null,
    body.progressPct ?? null,
    body.description ?? null,
    body.sortOrder ?? null,
    now, id
  );

  const row = db.prepare('SELECT * FROM progress WHERE id = ?').get(id) as any;
  const progress = rowToProgress(row);
  broadcast('progress_update', progress);
  return c.json(progress);
});

// DELETE /api/progress/:id
progressRouter.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM progress WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Progress not found' }, 404);

  db.prepare('DELETE FROM progress WHERE id = ?').run(id);
  return c.json({ deleted: id });
});

export default progressRouter;
