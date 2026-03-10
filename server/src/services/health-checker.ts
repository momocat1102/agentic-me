import { execFile } from 'child_process';
import { getDb } from '../db/schema.js';
import { broadcast } from './ws-broadcaster.js';
import type { Agent } from '../types/index.js';

let interval: NodeJS.Timeout | undefined;

export function startHealthChecker(agents: Agent[], intervalMs: number): void {
  if (interval) clearInterval(interval);

  runCheck(agents);
  interval = setInterval(() => runCheck(agents), intervalMs);
  console.log(`[Health] Checker started (every ${intervalMs / 1000}s)`);
}

async function runCheck(agents: Agent[]): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  let online = false;
  let claudeVersion: string | undefined;

  try {
    claudeVersion = await new Promise<string>((resolve, reject) => {
      execFile('claude', ['--version'], { timeout: 5000 }, (err, stdout) => {
        if (err) return reject(err);
        resolve(stdout.trim());
      });
    });
    online = true;
  } catch {
    online = false;
  }

  for (const agent of agents) {
    const newStatus = online ? 'idle' : 'offline';

    db.prepare(`
      UPDATE agents SET status = ?, claude_version = ?, last_health_check = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, claudeVersion || null, now, now, agent.id);

    if (agent.status !== newStatus || agent.claudeVersion !== claudeVersion) {
      agent.status = newStatus as Agent['status'];
      agent.claudeVersion = claudeVersion;
      agent.lastHealthCheck = now;
      broadcast('agent_status', { agentId: agent.id, status: newStatus, claudeVersion });
    }
  }
}

export function stopHealthChecker(): void {
  if (interval) {
    clearInterval(interval);
    interval = undefined;
  }
}
