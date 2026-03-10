import Database from 'better-sqlite3';
import path from 'path';
import { CONFIG } from '../config.js';

let db: ReturnType<typeof Database> | null = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(CONFIG.memcpDataDir, 'graph.db');
    db = new Database(dbPath, { readonly: true });
    db.pragma('journal_mode = WAL');
  }
  return db;
}

// === Types ===

export interface MemoryNode {
  id: string;
  content: string;
  summary: string;
  category: string;
  importance: string;
  effective_importance: number;
  tags: string[];
  entities: string[];
  project: string;
  session: string;
  token_count: number;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  feedback_score: number;
}

export interface MemoryEdge {
  source_id: string;
  target_id: string;
  edge_type: string;
  weight: number;
}

export interface MemoryStats {
  totalCount: number;
  projectCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  importanceCounts: Record<string, number>;
  edgeCounts: Record<string, number>;
}

export interface MemoryGraphData {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}

// === Helpers ===

function parseJsonField(val: string | null | undefined, fallback: any[] = []): any {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function rowToNode(row: any): MemoryNode {
  return {
    id: row.id,
    content: row.content,
    summary: row.summary || '',
    category: row.category,
    importance: row.importance,
    effective_importance: row.effective_importance,
    tags: parseJsonField(row.tags),
    entities: parseJsonField(row.entities),
    project: row.project,
    session: row.session || '',
    token_count: row.token_count,
    access_count: row.access_count,
    last_accessed_at: row.last_accessed_at,
    created_at: row.created_at,
    feedback_score: row.feedback_score || 0,
  };
}

// === API Functions ===

export function listMemories(
  project?: string,
  category?: string,
  importance?: string,
  limit = 50,
  offset = 0,
): MemoryNode[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: any[] = [];

  if (project) {
    conditions.push('project = ?');
    params.push(project);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (importance) {
    conditions.push('importance = ?');
    params.push(importance);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM nodes ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToNode);
}

export function searchMemories(query: string, limit = 20): MemoryNode[] {
  const db = getDb();
  const pattern = `%${query}%`;
  const sql = `SELECT * FROM nodes WHERE content LIKE ? OR summary LIKE ? ORDER BY effective_importance DESC LIMIT ?`;
  const rows = db.prepare(sql).all(pattern, pattern, limit);
  return rows.map(rowToNode);
}

export function getMemoryStats(): MemoryStats {
  const db = getDb();

  const totalCount = (db.prepare('SELECT COUNT(*) as cnt FROM nodes').get() as any).cnt;

  const projectRows = db.prepare(
    'SELECT project, COUNT(*) as cnt FROM nodes GROUP BY project'
  ).all() as any[];
  const projectCounts: Record<string, number> = {};
  for (const r of projectRows) projectCounts[r.project] = r.cnt;

  const catRows = db.prepare(
    'SELECT category, COUNT(*) as cnt FROM nodes GROUP BY category'
  ).all() as any[];
  const categoryCounts: Record<string, number> = {};
  for (const r of catRows) categoryCounts[r.category] = r.cnt;

  const impRows = db.prepare(
    'SELECT importance, COUNT(*) as cnt FROM nodes GROUP BY importance'
  ).all() as any[];
  const importanceCounts: Record<string, number> = {};
  for (const r of impRows) importanceCounts[r.importance] = r.cnt;

  const edgeRows = db.prepare(
    'SELECT edge_type, COUNT(*) as cnt FROM edges GROUP BY edge_type'
  ).all() as any[];
  const edgeCounts: Record<string, number> = {};
  for (const r of edgeRows) edgeCounts[r.edge_type] = r.cnt;

  return { totalCount, projectCounts, categoryCounts, importanceCounts, edgeCounts };
}

export function getMemoryGraph(project?: string): MemoryGraphData {
  const db = getDb();

  let nodesSql = 'SELECT * FROM nodes';
  const params: any[] = [];
  if (project) {
    nodesSql += ' WHERE project = ?';
    params.push(project);
  }
  const nodes = db.prepare(nodesSql).all(...params).map(rowToNode);

  const nodeIds = new Set(nodes.map(n => n.id));

  // Get all edges between these nodes
  const allEdges = db.prepare(
    'SELECT source_id, target_id, edge_type, weight FROM edges'
  ).all() as MemoryEdge[];

  const edges = allEdges.filter(
    e => nodeIds.has(e.source_id) && nodeIds.has(e.target_id)
  );

  return { nodes, edges };
}
