import { Hono } from 'hono';
import { getDb } from '../db/schema.js';

const discordWebhooksRouter = new Hono();

// GET /api/discord-webhooks - List all configured webhooks (masked URLs)
discordWebhooksRouter.get('/', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM discord_webhooks ORDER BY project').all() as any[];
  return c.json(rows.map((r) => ({
    project: r.project,
    webhookUrl: maskUrl(r.webhook_url),
    createdAt: r.created_at,
  })));
});

// POST /api/discord-webhooks - Register a webhook for a project
discordWebhooksRouter.post('/', async (c) => {
  const body = await c.req.json<{ project: string; webhookUrl: string }>();
  if (!body.project || !body.webhookUrl) {
    return c.json({ error: 'project and webhookUrl are required' }, 400);
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO discord_webhooks (project, webhook_url)
    VALUES (?, ?)
    ON CONFLICT(project) DO UPDATE SET webhook_url = excluded.webhook_url
  `).run(body.project, body.webhookUrl);

  return c.json({ ok: true, project: body.project }, 201);
});

// DELETE /api/discord-webhooks/:project - Remove a webhook
discordWebhooksRouter.delete('/:project', (c) => {
  const project = c.req.param('project');
  const db = getDb();
  const result = db.prepare('DELETE FROM discord_webhooks WHERE project = ?').run(project);
  if (result.changes === 0) return c.json({ error: 'Webhook not found' }, 404);
  return c.json({ ok: true, deleted: project });
});

function maskUrl(url: string): string {
  if (url.length <= 20) return '****' + url.slice(-8);
  return url.slice(0, 12) + '****' + url.slice(-8);
}

// Internal: get raw webhook URL for a project (used by discord-notifier)
export function getWebhookUrl(project: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT webhook_url FROM discord_webhooks WHERE project = ?').get(project) as any;
  return row?.webhook_url || null;
}

export default discordWebhooksRouter;
