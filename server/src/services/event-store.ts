import crypto from 'crypto';
import { getDb } from '../db/schema.js';
import { broadcast } from './ws-broadcaster.js';
import type { AgentEvent, EventType } from '../types/index.js';

export interface InsertEventInput {
  agentId: string;
  sessionId?: string;
  eventType: EventType;
  toolName?: string;
  data?: Record<string, unknown>;
}

export function insertEvent(input: InsertEventInput): AgentEvent {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO events (id, agent_id, session_id, event_type, tool_name, timestamp, data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.agentId,
    input.sessionId || null,
    input.eventType,
    input.toolName || null,
    now,
    input.data ? JSON.stringify(input.data) : null,
  );

  const event = rowToEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any);
  broadcast('event', event);
  return event;
}

export function getEventsByTask(taskId: string, limit = 100): AgentEvent[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM events WHERE task_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(taskId, limit) as any[];

  return rows.map(rowToEvent);
}

export function getEventsByAgent(agentId: string, limit = 100): AgentEvent[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM events WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(agentId, limit) as any[];

  return rows.map(rowToEvent);
}

export function getRecentEvents(limit = 50): AgentEvent[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM events ORDER BY timestamp DESC LIMIT ?'
  ).all(limit) as any[];

  return rows.map(rowToEvent);
}

function rowToEvent(row: any): AgentEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    agentId: row.agent_id,
    sessionId: row.session_id,
    eventType: row.event_type,
    toolName: row.tool_name,
    timestamp: row.timestamp,
    data: row.data ? JSON.parse(row.data) : undefined,
  };
}
