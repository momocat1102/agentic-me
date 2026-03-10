import { Hono } from 'hono';
import { getDb } from '../db/schema.js';
import { broadcast } from '../services/ws-broadcaster.js';
import type { CreateDeadlineInput, UpdateDeadlineInput, Deadline } from '../types/index.js';
import crypto from 'crypto';

const deadlinesRouter = new Hono();

function rowToDeadline(row: any): Deadline {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    category: row.category,
    relatedProject: row.related_project,
    description: row.description,
    isRecurring: !!row.is_recurring,
    recurrenceRule: row.recurrence_rule,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/deadlines
deadlinesRouter.get('/', (c) => {
  const db = getDb();
  const status = c.req.query('status');

  let rows: any[];
  if (status) {
    rows = db.prepare('SELECT * FROM deadlines WHERE status = ? ORDER BY due_date').all(status);
  } else {
    rows = db.prepare('SELECT * FROM deadlines ORDER BY due_date').all();
  }

  return c.json(rows.map(rowToDeadline));
});

// GET /api/deadlines/:id
deadlinesRouter.get('/:id', (c) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM deadlines WHERE id = ?').get(c.req.param('id')) as any;
  if (!row) return c.json({ error: 'Deadline not found' }, 404);
  return c.json(rowToDeadline(row));
});

// POST /api/deadlines
deadlinesRouter.post('/', async (c) => {
  const body = await c.req.json<CreateDeadlineInput>();
  if (!body.title || !body.dueDate) {
    return c.json({ error: 'title and dueDate are required' }, 400);
  }

  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO deadlines (id, title, due_date, category, related_project, description, is_recurring, recurrence_rule, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?)
  `).run(
    id, body.title, body.dueDate,
    body.category || 'other',
    body.relatedProject || null,
    body.description || null,
    body.isRecurring ? 1 : 0,
    body.recurrenceRule || null,
    now, now
  );

  const row = db.prepare('SELECT * FROM deadlines WHERE id = ?').get(id) as any;
  const deadline = rowToDeadline(row);
  broadcast('deadline_update', deadline);
  return c.json(deadline, 201);
});

// PUT /api/deadlines/:id
deadlinesRouter.put('/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM deadlines WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Deadline not found' }, 404);

  const body = await c.req.json<UpdateDeadlineInput>();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE deadlines SET
      title = COALESCE(?, title),
      due_date = COALESCE(?, due_date),
      category = COALESCE(?, category),
      related_project = COALESCE(?, related_project),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ?
  `).run(
    body.title ?? null,
    body.dueDate ?? null,
    body.category ?? null,
    body.relatedProject ?? null,
    body.description ?? null,
    body.status ?? null,
    now, id
  );

  const row = db.prepare('SELECT * FROM deadlines WHERE id = ?').get(id) as any;
  const deadline = rowToDeadline(row);
  broadcast('deadline_update', deadline);
  return c.json(deadline);
});

// DELETE /api/deadlines/:id
deadlinesRouter.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM deadlines WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Deadline not found' }, 404);

  db.prepare('DELETE FROM deadlines WHERE id = ?').run(id);
  return c.json({ deleted: id });
});

export default deadlinesRouter;
