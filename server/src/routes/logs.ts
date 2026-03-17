import { Hono } from 'hono';
import { getDb } from '../db/schema.js';

const logsRouter = new Hono();

// GET /api/logs?level=error&module=scheduler&limit=100&before=2026-03-08T10:00:00Z
logsRouter.get('/', (c) => {
  const level = c.req.query('level');
  const module = c.req.query('module');
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);
  const before = c.req.query('before');

  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (level) {
    conditions.push('level = ?');
    params.push(level);
  }
  if (module) {
    conditions.push('module = ?');
    params.push(module);
  }
  if (before) {
    conditions.push('timestamp < ?');
    params.push(before);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(
    `SELECT * FROM logs ${where} ORDER BY timestamp DESC LIMIT ?`
  ).all(...params, limit);

  return c.json(rows);
});

// GET /api/logs/modules - List distinct modules
logsRouter.get('/modules', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT module FROM logs ORDER BY module').all() as { module: string }[];
  return c.json(rows.map(r => r.module));
});

// DELETE /api/logs?before=2026-03-01T00:00:00Z
logsRouter.delete('/', (c) => {
  const before = c.req.query('before');
  const db = getDb();

  if (before) {
    const result = db.prepare('DELETE FROM logs WHERE timestamp < ?').run(before);
    return c.json({ deleted: result.changes });
  }

  const result = db.prepare('DELETE FROM logs').run();
  return c.json({ deleted: result.changes });
});

export default logsRouter;
