import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { getDb } from '../db/schema.js';
import { broadcast } from './ws-broadcaster.js';
import type { AgentActivity, AgentActivityStatus } from '../types/index.js';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes — faster transition to idle
const OFFLINE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_TTL_MS = 10 * 1000; // 10 seconds
const SCAN_INTERVAL_MS = 15 * 1000; // 15 seconds — faster detection

// --- Cache ---
let cachedActivities: AgentActivity[] | null = null;
let cacheTimestamp = 0;
let previousStatuses: Map<string, AgentActivityStatus> = new Map();
let scanTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Map project folder name to project id.
 * e.g. "-mnt-d-WorkSpace-system-agent" → "system-agent"
 */
function folderToProject(folderName: string): string {
  const parts = folderName.replace(/^-/, '').split('-');
  const filtered: string[] = [];
  let pastPrefix = false;
  for (const p of parts) {
    if (!pastPrefix && ['mnt', 'd', 'WorkSpace', 'Workspace', 'home', 'users', ''].includes(p)) {
      continue;
    }
    pastPrefix = true;
    filtered.push(p);
  }
  return filtered.join('-') || folderName;
}

/**
 * Get the last assistant message timestamp from a JSONL file (reads from end).
 * Only reads the last 50 lines for efficiency.
 */
async function getLastActivityTime(filePath: string): Promise<{ timestamp: string; sessionId: string } | null> {
  try {
    const stat = fs.statSync(filePath);
    // Skip files older than 24 hours
    if (Date.now() - stat.mtimeMs > OFFLINE_THRESHOLD_MS) return null;

    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let lastTimestamp: string | null = null;
    let sessionId = '';

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'assistant' && obj.timestamp) {
          lastTimestamp = obj.timestamp;
        }
        if (obj.sessionId && !sessionId) {
          sessionId = obj.sessionId;
        }
      } catch {
        // skip malformed lines
      }
    }

    if (lastTimestamp) {
      return { timestamp: lastTimestamp, sessionId };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Scan all JSONL files under a project folder, return the most recent activity.
 */
async function scanProjectFolder(projectDir: string): Promise<{ timestamp: string; sessionId: string } | null> {
  try {
    const entries = fs.readdirSync(projectDir, { withFileTypes: true });
    let latest: { timestamp: string; sessionId: string } | null = null;

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;

      const filePath = path.join(projectDir, entry.name);
      const stat = fs.statSync(filePath);
      // Only scan files modified in last 24 hours
      if (Date.now() - stat.mtimeMs > OFFLINE_THRESHOLD_MS) continue;

      const result = await getLastActivityTime(filePath);
      if (result && (!latest || result.timestamp > latest.timestamp)) {
        latest = result;
      }
    }

    // Also check subagents/ directory
    const subagentsDir = path.join(projectDir, 'subagents');
    if (fs.existsSync(subagentsDir)) {
      const subEntries = fs.readdirSync(subagentsDir, { withFileTypes: true });
      for (const entry of subEntries) {
        if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
        const filePath = path.join(subagentsDir, entry.name);
        const stat = fs.statSync(filePath);
        if (Date.now() - stat.mtimeMs > OFFLINE_THRESHOLD_MS) continue;

        const result = await getLastActivityTime(filePath);
        if (result && (!latest || result.timestamp > latest.timestamp)) {
          latest = result;
        }
      }
    }

    return latest;
  } catch {
    return null;
  }
}

/**
 * Scan all registered agents and determine their activity status.
 */
export async function scanAgentActivity(): Promise<AgentActivity[]> {
  // Check cache
  if (cachedActivities && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedActivities;
  }

  const db = getDb();
  const agents = db.prepare('SELECT id, name, path FROM agents ORDER BY name').all() as Array<{
    id: string;
    name: string;
    path: string;
  }>;

  // Build a map of project folder → agent
  // Agent path like "/mnt/d/WorkSpace/system-agent" maps to folder "-mnt-d-WorkSpace-system-agent"
  const agentFolderMap = new Map<string, { id: string; name: string }>();
  for (const agent of agents) {
    const folderName = agent.path.replace(/\//g, '-');
    agentFolderMap.set(folderName, { id: agent.id, name: agent.name });
  }

  const activities: AgentActivity[] = [];
  const now = Date.now();

  if (fs.existsSync(CLAUDE_PROJECTS_DIR)) {
    const projectFolders = fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });

    for (const folder of projectFolders) {
      if (!folder.isDirectory()) continue;

      const projectName = folderToProject(folder.name);
      const agent = agentFolderMap.get(folder.name);
      if (!agent) continue; // Not a registered agent

      const projectDir = path.join(CLAUDE_PROJECTS_DIR, folder.name);
      const lastActivity = await scanProjectFolder(projectDir);

      let status: AgentActivityStatus = 'offline';
      if (lastActivity) {
        const lastActiveMs = new Date(lastActivity.timestamp).getTime();
        if (now - lastActiveMs < ACTIVE_THRESHOLD_MS) {
          status = 'working';
        } else if (now - lastActiveMs < OFFLINE_THRESHOLD_MS) {
          status = 'idle';
        }
      }

      activities.push({
        agentId: agent.id,
        agentName: agent.name,
        status,
        lastActiveAt: lastActivity?.timestamp ?? null,
        currentProject: status === 'working' ? projectName : null,
        currentSessionId: status === 'working' ? (lastActivity?.sessionId ?? null) : null,
      });

      // Remove from map so we can track unmatched agents
      agentFolderMap.delete(folder.name);
    }
  }

  // Any remaining agents in map have no project folder → offline
  for (const [, agent] of agentFolderMap) {
    activities.push({
      agentId: agent.id,
      agentName: agent.name,
      status: 'offline',
      lastActiveAt: null,
      currentProject: null,
      currentSessionId: null,
    });
  }

  // Sort by agent name
  activities.sort((a, b) => a.agentName.localeCompare(b.agentName));

  cachedActivities = activities;
  cacheTimestamp = Date.now();
  return activities;
}

/**
 * Clear the activity cache (e.g., for manual refresh).
 */
export function clearActivityCache(): void {
  cachedActivities = null;
  cacheTimestamp = 0;
}

/**
 * Start periodic scanning and broadcast changes via WebSocket.
 */
export function startActivityScanner(): void {
  if (scanTimer) return;

  scanTimer = setInterval(async () => {
    try {
      // Force fresh scan
      cachedActivities = null;
      cacheTimestamp = 0;
      const activities = await scanAgentActivity();

      // Check for status changes
      let hasChanges = false;
      for (const activity of activities) {
        const prev = previousStatuses.get(activity.agentId);
        if (prev !== activity.status) {
          hasChanges = true;
          break;
        }
      }

      if (hasChanges) {
        // Update previous statuses
        previousStatuses = new Map(activities.map((a) => [a.agentId, a.status]));
        // Broadcast changes
        broadcast('agent:activity', activities);
      }
    } catch (err) {
      console.error('[ActivityScanner] Error:', err);
    }
  }, SCAN_INTERVAL_MS);

  console.log(`[ActivityScanner] Started (interval: ${SCAN_INTERVAL_MS / 1000}s)`);
}

/**
 * Stop the periodic scanner.
 */
export function stopActivityScanner(): void {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }
}
