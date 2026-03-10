import { getDb } from '../db/schema.js';
import { scanAgentCapabilities } from './capability-scanner.js';
import type { ToolUsageStat, AgentUsageSummary, ToolCategory } from '../types/index.js';

function periodToSince(period: string): string | null {
  const match = period.match(/^(\d+)d$/);
  if (!match) return null;
  const days = parseInt(match[1], 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return since.toISOString();
}

function classifyTool(toolName: string): ToolCategory {
  if (toolName.startsWith('mcp__')) return 'mcp';
  if (toolName.startsWith('skill:')) return 'skill';
  const builtins = ['Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'WebFetch', 'WebSearch',
    'Agent', 'TodoWrite', 'Skill', 'AskUserQuestion', 'NotebookEdit', 'ToolSearch'];
  if (builtins.includes(toolName)) return 'builtin';
  return 'builtin';
}

export function getToolUsageByAgent(agentId: string, period = '7d'): ToolUsageStat[] {
  const db = getDb();
  const since = periodToSince(period);

  let rows: any[];
  if (since) {
    rows = db.prepare(`
      SELECT tool_name, COUNT(*) as count, MAX(timestamp) as last_used
      FROM events
      WHERE agent_id = ? AND event_type = 'PostToolUse' AND tool_name IS NOT NULL
        AND timestamp >= ?
      GROUP BY tool_name
      ORDER BY count DESC
    `).all(agentId, since);
  } else {
    rows = db.prepare(`
      SELECT tool_name, COUNT(*) as count, MAX(timestamp) as last_used
      FROM events
      WHERE agent_id = ? AND event_type = 'PostToolUse' AND tool_name IS NOT NULL
      GROUP BY tool_name
      ORDER BY count DESC
    `).all(agentId);
  }

  return rows.map((r: any) => ({
    toolName: r.tool_name,
    count: r.count,
    lastUsed: r.last_used,
    category: classifyTool(r.tool_name),
  }));
}

export function getToolUsageGlobal(period = '7d'): ToolUsageStat[] {
  const db = getDb();
  const since = periodToSince(period);

  let rows: any[];
  if (since) {
    rows = db.prepare(`
      SELECT tool_name, COUNT(*) as count, MAX(timestamp) as last_used
      FROM events
      WHERE event_type = 'PostToolUse' AND tool_name IS NOT NULL
        AND timestamp >= ?
      GROUP BY tool_name
      ORDER BY count DESC
    `).all(since);
  } else {
    rows = db.prepare(`
      SELECT tool_name, COUNT(*) as count, MAX(timestamp) as last_used
      FROM events
      WHERE event_type = 'PostToolUse' AND tool_name IS NOT NULL
      GROUP BY tool_name
      ORDER BY count DESC
    `).all();
  }

  return rows.map((r: any) => ({
    toolName: r.tool_name,
    count: r.count,
    lastUsed: r.last_used,
    category: classifyTool(r.tool_name),
  }));
}

export function getAgentUsageSummary(period = '7d'): AgentUsageSummary[] {
  const db = getDb();
  const since = periodToSince(period);

  const condition = since
    ? `AND timestamp >= '${since}'`
    : '';

  const rows = db.prepare(`
    SELECT agent_id,
           COUNT(*) as total_calls,
           COUNT(DISTINCT tool_name) as unique_tools
    FROM events
    WHERE event_type = 'PostToolUse' AND tool_name IS NOT NULL
      ${condition}
    GROUP BY agent_id
    ORDER BY total_calls DESC
  `).all() as any[];

  return rows.map((r: any) => {
    const topRows = db.prepare(`
      SELECT tool_name, COUNT(*) as count
      FROM events
      WHERE agent_id = ? AND event_type = 'PostToolUse' AND tool_name IS NOT NULL
        ${condition}
      GROUP BY tool_name
      ORDER BY count DESC
      LIMIT 5
    `).all(r.agent_id) as any[];

    return {
      agentId: r.agent_id,
      totalCalls: r.total_calls,
      uniqueTools: r.unique_tools,
      topTools: topRows.map((t: any) => ({ toolName: t.tool_name, count: t.count })),
    };
  });
}

export function getUnusedTools(agentId: string, agentPath: string, period = '7d'): { tool: string; category: string }[] {
  const caps = scanAgentCapabilities(agentId, agentPath);
  const usage = getToolUsageByAgent(agentId, period);
  const usedSet = new Set(usage.map(u => u.toolName));

  const unused: { tool: string; category: string }[] = [];

  for (const skill of caps.skills) {
    // Skills are invoked via the "Skill" tool, hard to track individually
    // We'll still list them for reference
    if (!usedSet.has(skill.name)) {
      unused.push({ tool: skill.name, category: 'skill' });
    }
  }

  for (const cmd of caps.commands) {
    if (!usedSet.has(cmd.name)) {
      unused.push({ tool: cmd.name, category: 'command' });
    }
  }

  for (const group of caps.mcpTools) {
    for (const tool of group.tools) {
      const fullName = `mcp__${group.serverName}__${tool}`;
      if (!usedSet.has(fullName)) {
        unused.push({ tool: fullName, category: 'mcp' });
      }
    }
  }

  return unused;
}
