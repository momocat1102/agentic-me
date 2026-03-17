import { getDb } from '../db/schema.js';
import { broadcast } from './ws-broadcaster.js';
import { discordNotify } from './discord-notifier.js';
import type { Task, RecordTaskInput } from '../types/index.js';
import crypto from 'crypto';

function rowToTask(row: any): Task {
  return {
    id: row.id,
    agentId: row.agent_id,
    projectId: row.project_id || undefined,
    prompt: row.prompt,
    summary: row.summary,
    status: row.status,
    dispatchedBy: row.dispatched_by,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function recordTask(input: RecordTaskInput): Task {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks (id, agent_id, project_id, prompt, summary, status, dispatched_by, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, 'main-agent', ?, ?)
  `).run(id, input.agentId, input.projectId || null, input.prompt, input.summary, input.status || 'completed', now, now);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  const task = rowToTask(row);
  broadcast('task_update', task);

  if (task.projectId) {
    discordNotify(task.projectId, 'task_completed', {
      title: '✅ Task Completed',
      summary: task.summary || task.prompt.slice(0, 200),
      fields: [{ name: 'Agent', value: task.agentId, inline: true }],
    });
  }

  return task;
}

export function getTask(id: string): Task | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  return row ? rowToTask(row) : null;
}

export function updateTask(id: string, input: Partial<Pick<Task, 'prompt' | 'summary' | 'status' | 'projectId'>>): Task | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  if (!existing) return null;

  const fields: string[] = [];
  const params: any[] = [];

  if (input.prompt !== undefined) { fields.push('prompt = ?'); params.push(input.prompt); }
  if (input.summary !== undefined) { fields.push('summary = ?'); params.push(input.summary); }
  if (input.status !== undefined) { fields.push('status = ?'); params.push(input.status); }
  if (input.projectId !== undefined) { fields.push('project_id = ?'); params.push(input.projectId); }

  if (fields.length === 0) return rowToTask(existing);

  params.push(id);
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  const task = rowToTask(row);
  broadcast('task_update', task);
  return task;
}

export function deleteTask(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (result.changes > 0) {
    broadcast('task_delete', { id });
    return true;
  }
  return false;
}

export function listTasks(agentId?: string, projectId?: string, limit = 50): Task[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: any[] = [];

  if (agentId) {
    conditions.push('agent_id = ?');
    params.push(agentId);
  }
  if (projectId) {
    conditions.push('project_id = ?');
    params.push(projectId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  const rows = db.prepare(`SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT ?`).all(...params);
  return rows.map(rowToTask);
}
