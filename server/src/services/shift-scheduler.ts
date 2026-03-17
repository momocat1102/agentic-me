import * as cron from 'node-cron';
import { getDb } from '../db/schema.js';
import { executeScheduleRun, cleanupOrphanRuns, rowToSchedule } from './shift-executor.js';
import type { Schedule } from '../types/index.js';

const activeJobs = new Map<string, cron.ScheduledTask>();

export function initShiftScheduler(): void {
  // Clean up any runs that were 'running' when server stopped
  cleanupOrphanRuns();

  const db = getDb();
  const rows = db.prepare('SELECT * FROM schedules WHERE enabled = 1').all() as any[];

  for (const row of rows) {
    const schedule = rowToSchedule(row);
    addScheduleJob(schedule);
  }

  console.log(`[Schedule] Initialized ${rows.length} schedule(s)`);
}

export function addScheduleJob(schedule: Schedule): void {
  // Remove existing if any
  removeScheduleJob(schedule.id);

  if (!schedule.enabled) return;

  if (!cron.validate(schedule.cronExpr)) {
    console.error(`[Schedule] Invalid cron expression for "${schedule.name}": ${schedule.cronExpr}`);
    return;
  }

  const job = cron.schedule(schedule.cronExpr, () => {
    console.log(`[Schedule] Cron triggered: "${schedule.name}"`);
    // Re-read from DB to get latest prompt/settings
    const db = getDb();
    const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule.id) as any;
    if (!row || !row.enabled) return;
    const latest = rowToSchedule(row);
    executeScheduleRun(latest).catch((err) => {
      console.error(`[Schedule] Error executing "${schedule.name}":`, err);
    });
  }, {
    timezone: 'Asia/Taipei',
  });

  activeJobs.set(schedule.id, job);
  console.log(`[Schedule] Registered "${schedule.name}" — ${schedule.cronExpr}`);
}

export function removeScheduleJob(id: string): void {
  const job = activeJobs.get(id);
  if (job) {
    job.stop();
    activeJobs.delete(id);
  }
}

export function reloadScheduleJob(id: string): void {
  const db = getDb();
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  if (!row) {
    removeScheduleJob(id);
    return;
  }
  const schedule = rowToSchedule(row);
  addScheduleJob(schedule);
}

export async function triggerManually(id: string): Promise<any> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  if (!row) throw new Error('Schedule not found');
  const schedule = rowToSchedule(row);
  return executeScheduleRun(schedule);
}

export function getActiveScheduleIds(): string[] {
  return Array.from(activeJobs.keys());
}
