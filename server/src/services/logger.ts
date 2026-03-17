import { randomUUID } from 'crypto';
import { getDb } from '../db/schema.js';

export type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, module: string, message: string, data?: Record<string, unknown>) {
  const id = randomUUID();
  const dataJson = data ? JSON.stringify(data) : null;

  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO logs (id, level, module, message, data) VALUES (?, ?, ?, ?, ?)'
    ).run(id, level, module, message, dataJson);
  } catch {
    // Fallback to console if DB not ready
    console.error(`[logger] Failed to write log: ${level} ${module} ${message}`);
  }

  // Also print to console for immediate visibility
  const prefix = level === 'error' ? '\x1b[31m[ERROR]\x1b[0m' : level === 'warn' ? '\x1b[33m[WARN]\x1b[0m' : '[INFO]';
  console.log(`${prefix} [${module}] ${message}`);
}

export const logger = {
  info: (module: string, message: string, data?: Record<string, unknown>) => log('info', module, message, data),
  warn: (module: string, message: string, data?: Record<string, unknown>) => log('warn', module, message, data),
  error: (module: string, message: string, data?: Record<string, unknown>) => log('error', module, message, data),
};
