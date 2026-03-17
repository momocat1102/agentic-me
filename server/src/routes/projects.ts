import { Hono } from 'hono';
import { getDb } from '../db/schema.js';
import { broadcast } from '../services/ws-broadcaster.js';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../types/index.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

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

// GET /api/projects/:id/handoff - Lightweight context for Discord handoff
projectsRouter.get('/:id/handoff', (c) => {
  const db = getDb();
  const id = c.req.param('id');

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!row) return c.json({ error: 'Project not found' }, 404);

  // Recent tasks (last 5)
  const recentTasks = db.prepare(`
    SELECT summary, created_at FROM tasks
    WHERE project_id = ? ORDER BY created_at DESC LIMIT 5
  `).all(id) as { summary: string; created_at: string }[];

  // Active progress items (not completed)
  const activeProgress = db.prepare(`
    SELECT label, status, progress_pct FROM progress
    WHERE project = ? AND status != 'completed'
    ORDER BY sort_order, created_at
  `).all(id) as { label: string; status: string; progress_pct: number }[];

  // Last activity timestamp
  const lastTask = recentTasks[0];
  const lastActivity = lastTask?.created_at || row.updated_at;

  // One-line summary
  const parts: string[] = [];
  if (recentTasks.length > 0) {
    parts.push(`最近完成：${recentTasks[0].summary || '(無摘要)'}`);
  }
  if (activeProgress.length > 0) {
    parts.push(`進行中項目：${activeProgress.length} 個`);
  }
  const summary = parts.length > 0 ? parts.join('。') : 'No recent activity';

  return c.json({
    project: id,
    recentTasks: recentTasks.map((t) => ({
      summary: t.summary,
      timestamp: t.created_at,
    })),
    activeProgress: activeProgress.map((p) => ({
      label: p.label,
      status: p.status,
      percentage: p.progress_pct,
    })),
    lastActivity,
    summary,
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

// --- OpenSpec helpers & routes ---

const WORKSPACE_ROOT = '/mnt/d/WorkSpace';
const PROJECT_ID_RE = /^[a-z0-9-]+$/;

function resolveProjectDir(projectId: string): string | null {
  if (!PROJECT_ID_RE.test(projectId)) return null;
  const dir = path.join(WORKSPACE_ROOT, projectId);
  if (!fs.existsSync(dir)) return null;
  return dir;
}

function parseCheckboxStats(content: string) {
  const checked = (content.match(/- \[x\]/gi) || []).length;
  const unchecked = (content.match(/- \[ \]/g) || []).length;
  return { total: checked + unchecked, completed: checked };
}

function parseProposalStatus(content: string): string {
  const match = content.match(/^## Status\s*\n\s*(\S+)/m);
  if (!match) return 'draft';
  const s = match[1].toLowerCase();
  const valid = ['draft', 'in_progress', 'completed', 'archived'];
  return valid.includes(s) ? s : 'draft';
}

function getFirstParagraph(content: string): string | null {
  const lines = content.split('\n');
  const paras: string[] = [];
  let started = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      if (started) break;
      continue;
    }
    if (trimmed === '') {
      if (started) break;
      continue;
    }
    started = true;
    paras.push(trimmed);
  }
  return paras.length > 0 ? paras.join(' ') : null;
}

// Try to get changes from OpenSpec CLI JSON, returns null on failure
function getChangesFromCli(projectDir: string): { name: string; completedTasks: number; totalTasks: number; lastModified: string; status: string }[] | null {
  try {
    const output = execSync('openspec list --json', {
      cwd: projectDir,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(output);
    return parsed.changes || null;
  } catch {
    return null;
  }
}

// Read specs directory (shared between CLI and fs paths)
function readSpecsDir(openspecDir: string): { name: string; content: string }[] {
  const specsDir = path.join(openspecDir, 'specs');
  const specs: { name: string; content: string }[] = [];
  if (fs.existsSync(specsDir)) {
    const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(specsDir, file), 'utf-8');
      specs.push({ name: file, content });
    }
  }
  return specs;
}

// Read change details from filesystem (proposal summary, raw tasks)
function readChangeDetails(changePath: string) {
  const proposalPath = path.join(changePath, 'proposal.md');
  const tasksPath = path.join(changePath, 'tasks.md');

  const hasProposal = fs.existsSync(proposalPath);
  let proposalSummary: string | null = null;
  let status = 'draft';
  if (hasProposal) {
    const content = fs.readFileSync(proposalPath, 'utf-8');
    proposalSummary = getFirstParagraph(content);
    status = parseProposalStatus(content);
  }

  let tasksStats: { total: number; completed: number } | null = null;
  let rawTasksMd: string | null = null;
  if (fs.existsSync(tasksPath)) {
    rawTasksMd = fs.readFileSync(tasksPath, 'utf-8');
    tasksStats = parseCheckboxStats(rawTasksMd);
  }

  return { hasProposal, proposalSummary, status, tasksStats, rawTasksMd };
}

// Read archived changes from both custom (openspec/archive/) and official (openspec/changes/archive/) paths
function readArchivedChanges(openspecDir: string) {
  const archived: {
    name: string; status: string; hasProposal: boolean;
    proposalSummary: string | null; tasksStats: { total: number; completed: number } | null;
    rawTasksMd: string | null;
  }[] = [];

  const archivePaths = [
    path.join(openspecDir, 'archive'),           // custom path
    path.join(openspecDir, 'changes', 'archive'), // official path
  ];

  const seen = new Set<string>();
  for (const archiveDir of archivePaths) {
    if (!fs.existsSync(archiveDir)) continue;
    const dirs = fs.readdirSync(archiveDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    for (const dir of dirs) {
      if (seen.has(dir)) continue;
      seen.add(dir);
      const details = readChangeDetails(path.join(archiveDir, dir));
      archived.push({
        name: dir, status: 'archived', hasProposal: details.hasProposal,
        proposalSummary: details.proposalSummary, tasksStats: details.tasksStats,
        rawTasksMd: details.rawTasksMd,
      });
    }
  }
  return archived;
}

// GET /api/projects/:id/specs
projectsRouter.get('/:id/specs', (c) => {
  const projectId = c.req.param('id');
  const projectDir = resolveProjectDir(projectId);

  if (!projectDir) {
    return c.json({ hasOpenSpec: false, specs: [], changes: [] });
  }

  const openspecDir = path.join(projectDir, 'openspec');
  if (!fs.existsSync(openspecDir)) {
    return c.json({ hasOpenSpec: false, specs: [], changes: [] });
  }

  const specs = readSpecsDir(openspecDir);

  // Try CLI first, fallback to fs
  const cliChanges = getChangesFromCli(projectDir);

  const changes: {
    name: string; status: string; hasProposal: boolean;
    proposalSummary: string | null;
    tasksStats: { total: number; completed: number } | null;
    rawTasksMd: string | null;
    lastModified?: string;
  }[] = [];

  if (cliChanges) {
    // Enrich CLI data with fs details (proposal summary, raw tasks)
    for (const cliChange of cliChanges) {
      const changePath = path.join(openspecDir, 'changes', cliChange.name);
      const details = fs.existsSync(changePath)
        ? readChangeDetails(changePath)
        : { hasProposal: false, proposalSummary: null, status: 'draft', tasksStats: null, rawTasksMd: null };

      changes.push({
        name: cliChange.name,
        status: cliChange.status === 'in-progress' ? 'in_progress' : cliChange.status,
        hasProposal: details.hasProposal,
        proposalSummary: details.proposalSummary,
        tasksStats: { total: cliChange.totalTasks, completed: cliChange.completedTasks },
        rawTasksMd: details.rawTasksMd,
        lastModified: cliChange.lastModified,
      });
    }
  } else {
    // Fallback: read changes from filesystem directly
    const changesDir = path.join(openspecDir, 'changes');
    if (fs.existsSync(changesDir)) {
      const dirs = fs.readdirSync(changesDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'archive')
        .map(d => d.name);
      for (const dir of dirs) {
        const details = readChangeDetails(path.join(changesDir, dir));
        changes.push({
          name: dir, status: details.status, hasProposal: details.hasProposal,
          proposalSummary: details.proposalSummary, tasksStats: details.tasksStats,
          rawTasksMd: details.rawTasksMd,
        });
      }
    }
  }

  const archived = readArchivedChanges(openspecDir);

  return c.json({ hasOpenSpec: true, specs, changes, archived, source: cliChanges ? 'cli' : 'fs' });
});

// POST /api/projects/:id/specs/validate — run openspec validate via CLI
projectsRouter.post('/:id/specs/validate', (c) => {
  const projectDir = resolveProjectDir(c.req.param('id'));
  if (!projectDir) return c.json({ error: 'Project not found' }, 404);

  try {
    const output = execSync('openspec validate --all --json', {
      cwd: projectDir,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return c.json(JSON.parse(output));
  } catch (err: any) {
    // openspec validate exits 1 on failures but still outputs JSON to stderr/stdout
    const output = err.stdout || err.stderr || '';
    try {
      return c.json(JSON.parse(output));
    } catch {
      return c.json({ error: 'Validation failed', details: output }, 500);
    }
  }
});

// PUT /api/projects/:id/specs/changes/:name/status
projectsRouter.put('/:id/specs/changes/:name/status', async (c) => {
  const projectId = c.req.param('id');
  const changeName = c.req.param('name');
  const body = await c.req.json<{ status: string }>();

  if (!body.status) {
    return c.json({ error: 'status is required' }, 400);
  }

  const projectDir = resolveProjectDir(projectId);
  if (!projectDir) {
    return c.json({ error: 'Project directory not found' }, 404);
  }

  const changePath = path.join(projectDir, 'openspec', 'changes', changeName);
  const proposalPath = path.join(changePath, 'proposal.md');

  if (!fs.existsSync(changePath)) {
    return c.json({ error: 'Change not found' }, 404);
  }

  // Update status in proposal.md
  if (fs.existsSync(proposalPath)) {
    let content = fs.readFileSync(proposalPath, 'utf-8');
    if (/^## Status\s*\n/m.test(content)) {
      content = content.replace(/^(## Status\s*\n)\s*\S+/m, `$1${body.status}`);
    } else {
      // Insert after first heading
      content = content.replace(/^(# .+\n)/, `$1\n## Status\n${body.status}\n`);
    }
    fs.writeFileSync(proposalPath, content, 'utf-8');
  }

  // If archiving, move to archive/
  if (body.status === 'archived') {
    const archiveDir = path.join(projectDir, 'openspec', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });
    const archiveDest = path.join(archiveDir, changeName);
    fs.renameSync(changePath, archiveDest);

    // Update progress items to completed
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE progress SET status = 'completed', progress_pct = 100, updated_at = ?, updated_by = 'openspec' WHERE project = ? AND label LIKE ?"
    ).run(now, projectId, `[openspec:${changeName}%`);

    broadcast('progress_update', { project: projectId, change: changeName, archived: true });
    return c.json({ ok: true, status: 'archived', archived: true });
  }

  broadcast('progress_update', { project: projectId, change: changeName });
  return c.json({ ok: true, status: body.status });
});

// POST /api/projects/:id/specs/changes
projectsRouter.post('/:id/specs/changes', async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json<{ name: string; motivation?: string; tasks?: string[] }>();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const projectDir = resolveProjectDir(projectId);
  if (!projectDir) {
    return c.json({ error: 'Project directory not found' }, 404);
  }

  const changePath = path.join(projectDir, 'openspec', 'changes', body.name);
  if (fs.existsSync(changePath)) {
    return c.json({ error: 'Change already exists' }, 409);
  }

  fs.mkdirSync(path.join(changePath, 'specs'), { recursive: true });

  // Generate proposal.md
  const proposalContent = `# ${body.name}\n\n## Status\ndraft\n\n## Motivation\n${body.motivation || 'TBD'}\n\n## What Changes\nTBD\n\n## Implications\nTBD\n`;
  fs.writeFileSync(path.join(changePath, 'proposal.md'), proposalContent, 'utf-8');

  // Generate tasks.md
  if (body.tasks && body.tasks.length > 0) {
    const tasksMd = `# ${body.name} — Implementation Tasks\n\n${body.tasks.map(t => `- [ ] ${t}`).join('\n')}\n`;
    fs.writeFileSync(path.join(changePath, 'tasks.md'), tasksMd, 'utf-8');
  }

  broadcast('progress_update', { project: projectId, change: body.name });
  return c.json({ ok: true, name: body.name, created: true });
});

// POST /api/projects/:id/specs/import-tasks
projectsRouter.post('/:id/specs/import-tasks', async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json<{ changeName: string }>();

  if (!body.changeName) {
    return c.json({ error: 'changeName is required' }, 400);
  }

  const projectDir = resolveProjectDir(projectId);
  if (!projectDir) {
    return c.json({ error: 'Project directory not found' }, 404);
  }

  const tasksPath = path.join(projectDir, 'openspec', 'changes', body.changeName, 'tasks.md');
  if (!fs.existsSync(tasksPath)) {
    return c.json({ error: 'tasks.md not found' }, 404);
  }

  const content = fs.readFileSync(tasksPath, 'utf-8');
  const lines = content.split('\n');

  const db = getDb();
  const now = new Date().toISOString();

  // Check if project exists in DB
  const projectRow = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!projectRow) {
    return c.json({ error: 'Project not registered in Central Command' }, 404);
  }

  // Find or create parent progress group for this change
  const changeGroupLabel = `[openspec:${body.changeName}]`;
  let parentRow = db.prepare(
    "SELECT id FROM progress WHERE project = ? AND label LIKE ?"
  ).get(projectId, `${changeGroupLabel}%`) as any;

  if (!parentRow) {
    const parentId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO progress (id, project, label, category, status, progress_pct, parent_id, sort_order, updated_at, updated_by, created_at)
      VALUES (?, ?, ?, 'milestone', 'in_progress', 0, NULL, 0, ?, 'openspec', ?)
    `).run(parentId, projectId, `${changeGroupLabel} ${body.changeName}`, now, now);
    parentRow = { id: parentId };
  }

  let imported = 0;
  let updated = 0;
  let sortOrder = 0;

  for (const line of lines) {
    const checkMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (!checkMatch) continue;

    const isChecked = checkMatch[1].toLowerCase() === 'x';
    const taskLabel = checkMatch[2].trim();
    const hash = crypto.createHash('md5').update(taskLabel).digest('hex').slice(0, 8);
    const taggedLabel = `[openspec:${body.changeName}:${hash}] ${taskLabel}`;
    const status = isChecked ? 'completed' : 'not_started';

    // Check if already exists
    const existing = db.prepare(
      "SELECT id, status FROM progress WHERE project = ? AND label LIKE ?"
    ).get(projectId, `[openspec:${body.changeName}:${hash}]%`) as any;

    if (existing) {
      if (existing.status !== status) {
        db.prepare(
          "UPDATE progress SET status = ?, progress_pct = ?, updated_at = ?, updated_by = 'openspec' WHERE id = ?"
        ).run(status, isChecked ? 100 : 0, now, existing.id);
        updated++;
      }
    } else {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO progress (id, project, label, category, status, progress_pct, parent_id, sort_order, updated_at, updated_by, created_at)
        VALUES (?, ?, ?, 'milestone', ?, ?, ?, ?, ?, 'openspec', ?)
      `).run(id, projectId, taggedLabel, status, isChecked ? 100 : 0, parentRow.id, sortOrder, now, now);
      imported++;
    }
    sortOrder++;
  }

  // Update parent progress
  const children = db.prepare(
    "SELECT status FROM progress WHERE parent_id = ?"
  ).all(parentRow.id) as any[];

  if (children.length > 0) {
    const completedCount = children.filter((c: any) => c.status === 'completed').length;
    const pct = Math.round((completedCount / children.length) * 100);
    const parentStatus = pct === 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started';
    db.prepare(
      "UPDATE progress SET progress_pct = ?, status = ?, updated_at = ?, updated_by = 'openspec' WHERE id = ?"
    ).run(pct, parentStatus, now, parentRow.id);
  }

  broadcast('progress_update', { project: projectId, change: body.changeName });

  return c.json({ ok: true, imported, updated, total: imported + updated });
});

export default projectsRouter;
