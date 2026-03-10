import { exec, execSync } from 'child_process';
import { getDb } from '../db/schema.js';
import { broadcast } from './ws-broadcaster.js';
import type { Schedule, ScheduleRun } from '../types/index.js';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In-memory locks: scheduleId -> true (prevent duplicate tmux sessions)
const runningLocks = new Set<string>();

// --- Row mappers ---

function rowToRun(row: any): ScheduleRun {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    status: row.status,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    durationMs: row.duration_ms || undefined,
    output: row.output || undefined,
    error: row.error || undefined,
    report: row.report || undefined,
    exitCode: row.exit_code ?? undefined,
    roundNumber: row.round_number ?? undefined,
    roundType: row.round_type || undefined,
    feedback: row.feedback || undefined,
    createdAt: row.created_at,
  };
}

function rowToSchedule(row: any): Schedule {
  return {
    id: row.id,
    name: row.name,
    cronExpr: row.cron_expr,
    enabled: !!row.enabled,
    type: row.type || 'task',
    mode: row.mode || 'single',
    projectId: row.project_id || row.agent_id || '',
    workDir: row.work_dir || '',
    prompt: row.prompt,
    reviewPrompt: row.review_prompt || undefined,
    safetyRules: row.safety_rules || undefined,
    maxTurns: row.max_turns,
    timeoutMs: row.timeout_ms,
    frequency: row.frequency || 'daily',
    startTime: row.start_time || '02:00',
    dayOfWeek: row.day_of_week ?? undefined,
    intervalHours: row.interval_hours ?? undefined,
    windowStart: row.window_start || undefined,
    windowEnd: row.window_end || undefined,
    maxRounds: row.max_rounds ?? undefined,
    currentRound: row.current_round ?? 0,
    sessionDate: row.session_date || undefined,
    consecutiveFailures: row.consecutive_failures ?? 0,
    killConditions: row.kill_conditions || undefined,
    killReason: row.kill_reason || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Core: launch night-shift in tmux ---

function launchInTmux(schedule: Schedule): Promise<{ launched: boolean; sessionName: string; error?: string }> {
  const budgetUsd = schedule.maxTurns ? Math.max(0.5, schedule.maxTurns * 0.05) : 5;
  const scriptPath = path.resolve(__dirname, '../../../scripts/launch-night-shift.sh');

  return new Promise((resolve) => {
    exec(`bash "${scriptPath}" "${schedule.id}" ${budgetUsd}`, (err, stdout, stderr) => {
      const sessionName = `night-${schedule.id.slice(0, 8)}`;
      if (err) {
        console.error(`[Schedule] Launch failed for "${schedule.name}":`, stderr || err.message);
        resolve({ launched: false, sessionName, error: stderr || err.message });
        return;
      }
      console.log(`[Schedule] Night-shift launched for "${schedule.name}" in tmux session: ${sessionName}`);
      resolve({ launched: true, sessionName });
    });
  });
}

// --- Public API ---

export async function executeScheduleRun(schedule: Schedule): Promise<ScheduleRun> {
  const db = getDb();
  const runId = crypto.randomUUID();

  // Lock check: prevent duplicate tmux sessions for same schedule
  if (runningLocks.has(schedule.id)) {
    db.prepare(`
      INSERT INTO schedule_runs (id, schedule_id, status, created_at)
      VALUES (?, ?, 'skipped', datetime('now'))
    `).run(runId, schedule.id);
    const row = db.prepare('SELECT * FROM schedule_runs WHERE id = ?').get(runId) as any;
    const run = rowToRun(row);
    broadcast('schedule_update', run);
    console.log(`[Schedule] Skipped "${schedule.name}" — already running in tmux`);
    return run;
  }

  // Check if tmux session already exists (e.g. from manual launch)
  const sessionName = `night-${schedule.id.slice(0, 8)}`;
  try {
    execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`);
    // Session exists — skip
    console.log(`[Schedule] Skipped "${schedule.name}" — tmux session "${sessionName}" already exists`);
    db.prepare(`
      INSERT INTO schedule_runs (id, schedule_id, status, error, created_at)
      VALUES (?, ?, 'skipped', 'tmux session already exists', datetime('now'))
    `).run(runId, schedule.id);
    const row = db.prepare('SELECT * FROM schedule_runs WHERE id = ?').get(runId) as any;
    return rowToRun(row);
  } catch {
    // Session doesn't exist — proceed
  }

  // Acquire lock
  runningLocks.add(schedule.id);

  // Launch tmux session
  const result = await launchInTmux(schedule);

  if (!result.launched) {
    runningLocks.delete(schedule.id);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO schedule_runs (id, schedule_id, status, error, started_at, completed_at, created_at)
      VALUES (?, ?, 'failed', ?, ?, ?, ?)
    `).run(runId, schedule.id, result.error || 'Failed to launch tmux', now, now, now);
    const row = db.prepare('SELECT * FROM schedule_runs WHERE id = ?').get(runId) as any;
    const run = rowToRun(row);
    broadcast('schedule_update', run);
    return run;
  }

  // Broadcast launch event (actual run records will be created by /night-shift command via report-round API)
  broadcast('schedule_update', { id: schedule.id, launched: true, sessionName: result.sessionName });
  console.log(`[Schedule] "${schedule.name}" launched — /night-shift will report progress via API`);

  // Release lock after a delay (the /night-shift command handles its own lifecycle)
  // We keep lock for 30s to prevent immediate re-trigger, then release
  setTimeout(() => {
    runningLocks.delete(schedule.id);
  }, 30000);

  // Return a pending placeholder (actual runs are created by the /night-shift command)
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO schedule_runs (id, schedule_id, status, started_at, created_at)
    VALUES (?, ?, 'pending', ?, ?)
  `).run(runId, schedule.id, now, now);
  const row = db.prepare('SELECT * FROM schedule_runs WHERE id = ?').get(runId) as any;
  return rowToRun(row);
}

export function stopRun(runId: string): boolean {
  // Legacy: no longer tracking child processes
  // Stopping is handled via POST /schedules/:id/stop-session (kills tmux)
  return false;
}

export function isRunning(scheduleId: string): boolean {
  if (runningLocks.has(scheduleId)) return true;
  // Also check if tmux session exists
  const sessionName = `night-${scheduleId.slice(0, 8)}`;
  try {
    execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`);
    return true;
  } catch {
    return false;
  }
}

export function cleanupOrphanRuns(): void {
  const db = getDb();
  db.prepare(`
    UPDATE schedule_runs SET status = 'failed', error = 'Server restarted during execution'
    WHERE status = 'running'
  `).run();
}

export { rowToRun, rowToSchedule };
