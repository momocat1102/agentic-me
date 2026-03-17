import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../data/central-command.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

    db = new Database(DB_PATH, {});
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function safeAddColumn(db: Database.Database, table: string, column: string, type: string): void {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch {
    // Column already exists
  }
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      path TEXT NOT NULL,
      is_orchestrator INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idle',
      claude_version TEXT,
      last_health_check TEXT,
      active_tasks INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      parent_task_id TEXT,
      dispatched_by TEXT DEFAULT 'dashboard',
      prompt TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      allowed_tools TEXT,
      max_budget_usd REAL,
      permission_mode TEXT DEFAULT 'acceptEdits',
      session_id TEXT,
      tmux_session TEXT,
      result TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      agent_id TEXT NOT NULL,
      session_id TEXT,
      event_type TEXT NOT NULL,
      tool_name TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      data TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
    CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id);
    CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      label TEXT NOT NULL,
      category TEXT DEFAULT 'project',
      status TEXT DEFAULT 'not_started',
      progress_pct INTEGER DEFAULT 0,
      description TEXT,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES progress(id)
    );

    CREATE INDEX IF NOT EXISTS idx_progress_project ON progress(project);
    CREATE INDEX IF NOT EXISTS idx_progress_parent ON progress(parent_id);

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

    CREATE TABLE IF NOT EXISTS deadlines (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      category TEXT DEFAULT 'other',
      related_project TEXT,
      description TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurrence_rule TEXT,
      status TEXT DEFAULT 'upcoming',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_deadlines_due ON deadlines(due_date);
    CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cron_expr TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      type TEXT DEFAULT 'task',
      agent_id TEXT NOT NULL,
      project_id TEXT,
      prompt TEXT NOT NULL,
      safety_rules TEXT,
      max_turns INTEGER DEFAULT 50,
      timeout_ms INTEGER DEFAULT 600000,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);

    CREATE TABLE IF NOT EXISTS schedule_runs (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      duration_ms INTEGER,
      output TEXT,
      error TEXT,
      report TEXT,
      exit_code INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_runs_schedule ON schedule_runs(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_runs_status ON schedule_runs(status);
    CREATE INDEX IF NOT EXISTS idx_schedule_runs_created ON schedule_runs(created_at);
  `);

  // Usage billing table
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_billing (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      source TEXT DEFAULT 'manual',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_usage_billing_date ON usage_billing(date);
  `);

  // Migration: add summary column to tasks table
  safeAddColumn(db, 'tasks', 'summary', 'TEXT');

  // Migration: add project_id to tasks table
  safeAddColumn(db, 'tasks', 'project_id', 'TEXT');

  // Create index for tasks.project_id (safe: IF NOT EXISTS)
  db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)');

  // Migration: schedules table — project-oriented + simple time fields
  safeAddColumn(db, 'schedules', 'work_dir', 'TEXT');
  safeAddColumn(db, 'schedules', 'frequency', "TEXT DEFAULT 'daily'");
  safeAddColumn(db, 'schedules', 'start_time', "TEXT DEFAULT '02:00'");
  safeAddColumn(db, 'schedules', 'day_of_week', 'INTEGER');

  // Migration: iterative schedule support
  safeAddColumn(db, 'schedules', 'mode', "TEXT DEFAULT 'single'");
  safeAddColumn(db, 'schedules', 'review_prompt', 'TEXT');
  safeAddColumn(db, 'schedules', 'interval_hours', 'INTEGER');
  safeAddColumn(db, 'schedules', 'window_start', 'TEXT');
  safeAddColumn(db, 'schedules', 'window_end', 'TEXT');
  safeAddColumn(db, 'schedules', 'max_rounds', 'INTEGER');
  safeAddColumn(db, 'schedules', 'current_round', 'INTEGER DEFAULT 0');
  safeAddColumn(db, 'schedules', 'session_date', 'TEXT');

  safeAddColumn(db, 'schedule_runs', 'round_number', 'INTEGER');
  safeAddColumn(db, 'schedule_runs', 'round_type', 'TEXT');
  safeAddColumn(db, 'schedule_runs', 'feedback', 'TEXT');

  // Migration: circuit breaker support
  safeAddColumn(db, 'schedules', 'consecutive_failures', 'INTEGER DEFAULT 0');
  safeAddColumn(db, 'schedules', 'kill_conditions', 'TEXT');
  safeAddColumn(db, 'schedules', 'kill_reason', 'TEXT');

  // Logs table for structured logging
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      module TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
    CREATE INDEX IF NOT EXISTS idx_logs_module ON logs(module);
  `);

  // Discord webhook configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS discord_webhooks (
      project TEXT PRIMARY KEY,
      webhook_url TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
