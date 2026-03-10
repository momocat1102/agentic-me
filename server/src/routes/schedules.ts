import { Hono } from 'hono';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/schema.js';
import { broadcast } from '../services/ws-broadcaster.js';
import { rowToRun, rowToSchedule, isRunning, stopRun } from '../services/shift-executor.js';
import { addScheduleJob, removeScheduleJob, reloadScheduleJob, triggerManually, getActiveScheduleIds } from '../services/shift-scheduler.js';
import type { CreateScheduleInput, UpdateScheduleInput } from '../types/index.js';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const schedulesRouter = new Hono();

function buildCronExpr(
  frequency: string,
  startTime: string,
  dayOfWeek?: number,
  intervalHours?: number,
  windowStart?: string,
  windowEnd?: string,
): string {
  const [hour, min] = startTime.split(':');

  if (frequency === 'interval' && intervalHours && windowStart && windowEnd) {
    // Generate multi-hour cron: e.g., interval=2, window=22:00-06:00 → "0 22,0,2,4,6 * * *"
    const startH = parseInt(windowStart.split(':')[0]);
    const endH = parseInt(windowEnd.split(':')[0]);
    const startMin = windowStart.split(':')[1] || '0';
    const hours: number[] = [];

    let h = startH;
    for (let i = 0; i < 24; i += intervalHours) {
      const currentH = (startH + i) % 24;
      hours.push(currentH);
      // Check if we've passed the end hour
      if (hours.length > 1) {
        // For overnight windows (22-06): stop when we pass endH in the morning
        if (startH > endH) {
          if (currentH >= endH && currentH < startH) break;
        } else {
          if (currentH >= endH) break;
        }
      }
    }

    return `${startMin} ${hours.join(',')} * * *`;
  }

  switch (frequency) {
    case 'weekly': return `${min} ${hour} * * ${dayOfWeek ?? 0}`;
    case 'once':
    case 'daily':
    default: return `${min} ${hour} * * *`;
  }
}

// GET /api/schedules — list all schedules
schedulesRouter.get('/', (c) => {
  const db = getDb();
  const type = c.req.query('type');
  const mode = c.req.query('mode');

  let rows: any[];
  if (type) {
    rows = db.prepare('SELECT * FROM schedules WHERE type = ? ORDER BY created_at DESC').all(type);
  } else if (mode) {
    rows = db.prepare('SELECT * FROM schedules WHERE mode = ? ORDER BY created_at DESC').all(mode);
  } else {
    rows = db.prepare('SELECT * FROM schedules ORDER BY created_at DESC').all();
  }

  const schedules = rows.map(rowToSchedule);

  // Attach last run info
  const enriched = schedules.map((s) => {
    const lastRun = db.prepare(
      'SELECT * FROM schedule_runs WHERE schedule_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(s.id) as any;
    return {
      ...s,
      lastRun: lastRun ? rowToRun(lastRun) : null,
      isRunning: isRunning(s.id),
    };
  });

  return c.json(enriched);
});

// POST /api/schedules — create schedule
schedulesRouter.post('/', async (c) => {
  const body = await c.req.json<CreateScheduleInput>();
  if (!body.name || !body.projectId || !body.prompt) {
    return c.json({ error: 'name, projectId, and prompt are required' }, 400);
  }

  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const mode = body.mode || 'single';
  const frequency = mode === 'iterative' ? 'interval' : (body.frequency || 'daily');
  const startTime = mode === 'iterative' ? (body.windowStart || '22:00') : (body.startTime || '02:00');

  const cronExpr = buildCronExpr(
    frequency, startTime, body.dayOfWeek,
    body.intervalHours, body.windowStart, body.windowEnd
  );

  db.prepare(`
    INSERT INTO schedules (
      id, name, cron_expr, enabled, type, agent_id, project_id, work_dir,
      prompt, safety_rules, max_turns, timeout_ms,
      frequency, start_time, day_of_week,
      mode, review_prompt, interval_hours, window_start, window_end, max_rounds,
      current_round, session_date,
      created_at, updated_at
    )
    VALUES (?, ?, ?, 1, 'task', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
  `).run(
    id, body.name, cronExpr,
    body.projectId,
    body.projectId,
    body.workDir || `${process.env.WORKSPACE_DIR || require('os').homedir() + '/workspace'}/${body.projectId}`,
    body.prompt,
    body.safetyRules || null,
    body.maxTurns ?? 50,
    body.timeoutMs ?? 600000,
    frequency,
    startTime,
    body.dayOfWeek ?? null,
    mode,
    body.reviewPrompt || null,
    body.intervalHours ?? null,
    body.windowStart || null,
    body.windowEnd || null,
    body.maxRounds ?? null,
    now, now
  );

  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  const schedule = rowToSchedule(row);

  addScheduleJob(schedule);

  broadcast('schedule_update', schedule);
  return c.json(schedule, 201);
});

// PUT /api/schedules/:id — update schedule
schedulesRouter.put('/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Schedule not found' }, 404);

  const body = await c.req.json<UpdateScheduleInput>();
  const now = new Date().toISOString();

  // Determine new values
  const newMode = body.mode ?? existing.mode ?? 'single';
  const newFrequency = newMode === 'iterative' ? 'interval' : (body.frequency ?? existing.frequency ?? 'daily');
  const newStartTime = newMode === 'iterative'
    ? (body.windowStart ?? existing.window_start ?? '22:00')
    : (body.startTime ?? existing.start_time ?? '02:00');
  const newDayOfWeek = body.dayOfWeek ?? existing.day_of_week;
  const newIntervalHours = body.intervalHours ?? existing.interval_hours;
  const newWindowStart = body.windowStart ?? existing.window_start;
  const newWindowEnd = body.windowEnd ?? existing.window_end;

  // Rebuild cron_expr if any time-related field changed
  const timeFieldsChanged = body.frequency || body.startTime || body.dayOfWeek !== undefined
    || body.mode || body.intervalHours || body.windowStart || body.windowEnd;
  const newCronExpr = timeFieldsChanged
    ? buildCronExpr(newFrequency, newStartTime, newDayOfWeek, newIntervalHours, newWindowStart, newWindowEnd)
    : null;

  db.prepare(`
    UPDATE schedules SET
      name = COALESCE(?, name),
      cron_expr = COALESCE(?, cron_expr),
      enabled = COALESCE(?, enabled),
      project_id = COALESCE(?, project_id),
      work_dir = COALESCE(?, work_dir),
      prompt = COALESCE(?, prompt),
      safety_rules = COALESCE(?, safety_rules),
      max_turns = COALESCE(?, max_turns),
      timeout_ms = COALESCE(?, timeout_ms),
      frequency = COALESCE(?, frequency),
      start_time = COALESCE(?, start_time),
      day_of_week = COALESCE(?, day_of_week),
      mode = COALESCE(?, mode),
      review_prompt = COALESCE(?, review_prompt),
      interval_hours = COALESCE(?, interval_hours),
      window_start = COALESCE(?, window_start),
      window_end = COALESCE(?, window_end),
      max_rounds = COALESCE(?, max_rounds),
      updated_at = ?
    WHERE id = ?
  `).run(
    body.name ?? null,
    newCronExpr,
    body.enabled !== undefined ? (body.enabled ? 1 : 0) : null,
    body.projectId ?? null,
    body.workDir ?? null,
    body.prompt ?? null,
    body.safetyRules ?? null,
    body.maxTurns ?? null,
    body.timeoutMs ?? null,
    body.frequency ?? null,
    body.startTime ?? null,
    body.dayOfWeek ?? null,
    body.mode ?? null,
    body.reviewPrompt ?? null,
    body.intervalHours ?? null,
    body.windowStart ?? null,
    body.windowEnd ?? null,
    body.maxRounds ?? null,
    now, id
  );

  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  const schedule = rowToSchedule(row);

  reloadScheduleJob(id);

  broadcast('schedule_update', schedule);
  return c.json(schedule);
});

// DELETE /api/schedules/:id
schedulesRouter.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Schedule not found' }, 404);

  removeScheduleJob(id);

  db.prepare('DELETE FROM schedule_runs WHERE schedule_id = ?').run(id);
  db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  return c.json({ deleted: id });
});

// GET /api/schedules/runs — list runs
schedulesRouter.get('/runs', (c) => {
  const db = getDb();
  const scheduleId = c.req.query('scheduleId');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');

  const conditions: string[] = [];
  const params: any[] = [];

  if (scheduleId) {
    conditions.push('sr.schedule_id = ?');
    params.push(scheduleId);
  }
  if (status) {
    conditions.push('sr.status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  const rows = db.prepare(`
    SELECT sr.*, s.name as schedule_name, s.type as schedule_type, s.mode as schedule_mode
    FROM schedule_runs sr
    LEFT JOIN schedules s ON s.id = sr.schedule_id
    ${where}
    ORDER BY sr.created_at DESC
    LIMIT ?
  `).all(...params) as any[];

  return c.json(rows.map((r: any) => ({
    ...rowToRun(r),
    scheduleName: r.schedule_name,
    scheduleType: r.schedule_type,
    scheduleMode: r.schedule_mode,
  })));
});

// GET /api/schedules/runs/:id — single run detail
schedulesRouter.get('/runs/:id', (c) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT sr.*, s.name as schedule_name, s.type as schedule_type, s.mode as schedule_mode
    FROM schedule_runs sr
    LEFT JOIN schedules s ON s.id = sr.schedule_id
    WHERE sr.id = ?
  `).get(c.req.param('id')) as any;
  if (!row) return c.json({ error: 'Run not found' }, 404);
  return c.json({
    ...rowToRun(row),
    scheduleName: row.schedule_name,
    scheduleType: row.schedule_type,
    scheduleMode: row.schedule_mode,
  });
});

// POST /api/schedules/:id/trigger — manually trigger
schedulesRouter.post('/:id/trigger', async (c) => {
  try {
    const run = await triggerManually(c.req.param('id'));
    return c.json(run);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// POST /api/schedules/:id/reset-round — reset round counter for iterative schedules
schedulesRouter.post('/:id/reset-round', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Schedule not found' }, 404);

  db.prepare(`UPDATE schedules SET current_round = 0, session_date = NULL, consecutive_failures = 0, kill_reason = NULL, updated_at = datetime('now') WHERE id = ?`).run(id);

  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  const schedule = rowToSchedule(row);
  broadcast('schedule_update', schedule);
  return c.json(schedule);
});

// POST /api/schedules/:id/report-round — loop executor reports round result
// status=running: creates a new run record (returns runId for later update)
// status=completed|failed: if runId provided, updates existing; otherwise creates new
schedulesRouter.post('/:id/report-round', async (c) => {
  const db = getDb();
  const scheduleId = c.req.param('id');
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId) as any;
  if (!existing) return c.json({ error: 'Schedule not found' }, 404);

  const body = await c.req.json<{
    roundNumber: number;
    status: 'running' | 'completed' | 'failed';
    runId?: string;
    report?: string;
    feedback?: string;
  }>();

  if (!body.roundNumber || !body.status) {
    return c.json({ error: 'roundNumber and status are required' }, 400);
  }

  const now = new Date().toISOString();

  if (body.status === 'running') {
    // Start of round: create new run record
    const runId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO schedule_runs (id, schedule_id, status, started_at, round_number, round_type, created_at)
      VALUES (?, ?, 'running', ?, ?, 'task', ?)
    `).run(runId, scheduleId, now, body.roundNumber, now);

    db.prepare(`UPDATE schedules SET current_round = ?, updated_at = ? WHERE id = ?`)
      .run(body.roundNumber, now, scheduleId);

    const row = db.prepare('SELECT * FROM schedule_runs WHERE id = ?').get(runId) as any;
    const run = rowToRun(row);
    broadcast('schedule_update', run);

    console.log(`[Schedule] Night-shift started: "${existing.name}" round ${body.roundNumber}`);
    return c.json(run, 201);
  }

  // End of round: update existing or create new
  let run: any;
  let isNew = false;

  if (body.runId) {
    // Update existing run
    db.prepare(`
      UPDATE schedule_runs SET
        status = ?, completed_at = ?,
        duration_ms = CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER),
        report = ?, feedback = ?
      WHERE id = ?
    `).run(body.status, now, now, body.report || null, body.feedback || null, body.runId);

    db.prepare(`UPDATE schedules SET current_round = ?, updated_at = ? WHERE id = ?`)
      .run(body.roundNumber, now, scheduleId);

    const row = db.prepare('SELECT * FROM schedule_runs WHERE id = ?').get(body.runId) as any;
    run = rowToRun(row);
  } else {
    // No runId: create a complete record (backward compatible)
    const runId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO schedule_runs (id, schedule_id, status, started_at, completed_at, round_number, round_type, report, feedback, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'task', ?, ?, ?)
    `).run(runId, scheduleId, body.status, now, now, body.roundNumber, body.report || null, body.feedback || null, now);

    db.prepare(`UPDATE schedules SET current_round = ?, updated_at = ? WHERE id = ?`)
      .run(body.roundNumber, now, scheduleId);

    const row = db.prepare('SELECT * FROM schedule_runs WHERE id = ?').get(runId) as any;
    run = rowToRun(row);
    isNew = true;
  }

  // --- Circuit Breaker: track consecutive failures ---
  const MAX_CONSECUTIVE_FAILURES = 3;

  if (body.status === 'failed') {
    const newCount = (existing.consecutive_failures ?? 0) + 1;
    if (newCount >= MAX_CONSECUTIVE_FAILURES) {
      // Auto-disable schedule
      const killReason = `Circuit breaker: ${newCount} consecutive failures (round ${body.roundNumber})`;
      db.prepare(`UPDATE schedules SET consecutive_failures = ?, enabled = 0, kill_reason = ?, updated_at = ? WHERE id = ?`)
        .run(newCount, killReason, now, scheduleId);
      console.log(`[Schedule] Circuit breaker triggered for "${existing.name}": ${killReason}`);
      broadcast('schedule_update', { id: scheduleId, enabled: false, killReason });
    } else {
      db.prepare(`UPDATE schedules SET consecutive_failures = ?, updated_at = ? WHERE id = ?`)
        .run(newCount, now, scheduleId);
    }
  } else if (body.status === 'completed') {
    // Reset consecutive failure counter on success
    if (existing.consecutive_failures > 0) {
      db.prepare(`UPDATE schedules SET consecutive_failures = 0, updated_at = ? WHERE id = ?`)
        .run(now, scheduleId);
    }
  }

  broadcast('schedule_update', run);
  console.log(`[Schedule] Night-shift report: "${existing.name}" round ${body.roundNumber} — ${body.status}`);
  return isNew ? c.json(run, 201) : c.json(run);
});

// POST /api/schedules/:id/launch — launch night-shift in tmux
schedulesRouter.post('/:id/launch', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Schedule not found' }, 404);

  const body = await c.req.json<{ budget?: number }>().catch(() => ({} as { budget?: number }));
  const budget = body.budget ?? 5;

  // 確保 enabled=true，否則 /night-shift 會拒絕執行
  if (!existing.enabled) {
    db.prepare('UPDATE schedules SET enabled = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id);
  }

  const scriptPath = path.resolve(__dirname, '../../../scripts/launch-night-shift.sh');

  return new Promise<Response>((resolve) => {
    exec(`bash "${scriptPath}" "${id}" ${budget}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`[Schedule] Launch failed for "${existing.name}":`, stderr);
        resolve(c.json({ error: stderr || err.message }, 500));
        return;
      }
      const sessionName = `night-${id.slice(0, 8)}`;
      console.log(`[Schedule] Night-shift launched for "${existing.name}" in tmux session: ${sessionName}`);
      broadcast('schedule_update', { id, launched: true, sessionName });
      resolve(c.json({ launched: true, sessionName, output: stdout.trim() }));
    });
  });
});

// POST /api/schedules/:id/stop-session — kill tmux session for this schedule
schedulesRouter.post('/:id/stop-session', async (c) => {
  const id = c.req.param('id');
  const sessionName = `night-${id.slice(0, 8)}`;

  return new Promise<Response>((resolve) => {
    exec(`tmux kill-session -t "${sessionName}" 2>&1`, (err, stdout, stderr) => {
      if (err) {
        console.log(`[Schedule] No tmux session "${sessionName}" to kill`);
        resolve(c.json({ stopped: false, message: 'Session not found' }));
        return;
      }
      console.log(`[Schedule] Killed tmux session "${sessionName}"`);
      // Mark any running runs as failed
      const db = getDb();
      db.prepare(`UPDATE schedule_runs SET status = 'failed', completed_at = datetime('now') WHERE schedule_id = ? AND status = 'running'`).run(id);
      broadcast('schedule_update', { id, stopped: true });
      resolve(c.json({ stopped: true, sessionName }));
    });
  });
});

// POST /api/schedules/runs/:id/stop — stop a running execution
schedulesRouter.post('/runs/:id/stop', (c) => {
  const success = stopRun(c.req.param('id'));
  if (!success) return c.json({ error: 'Run not found or not running' }, 404);
  return c.json({ stopped: true });
});

// GET /api/schedules/status — overall status summary
schedulesRouter.get('/status', (c) => {
  const db = getDb();
  const totalSchedules = (db.prepare('SELECT COUNT(*) as count FROM schedules WHERE enabled = 1').get() as any).count;
  const activeIds = getActiveScheduleIds();
  const runningCount = (db.prepare("SELECT COUNT(*) as count FROM schedule_runs WHERE status = 'running'").get() as any).count;
  const lastRun = db.prepare('SELECT * FROM schedule_runs ORDER BY created_at DESC LIMIT 1').get() as any;

  return c.json({
    activeSchedules: totalSchedules,
    registeredJobs: activeIds.length,
    runningCount,
    lastRun: lastRun ? rowToRun(lastRun) : null,
  });
});

// GET /api/schedules/:id — get single schedule details (must be LAST to avoid catching /runs, /status)
schedulesRouter.get('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  if (!row) return c.json({ error: 'Schedule not found' }, 404);
  return c.json(rowToSchedule(row));
});

export default schedulesRouter;
