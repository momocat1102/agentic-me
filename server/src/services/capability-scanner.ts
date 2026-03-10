import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AgentSkill, AgentCommand, McpToolGroup, AgentCapabilities } from '../types/index.js';

const HOME = os.homedir();
const GLOBAL_COMMANDS_DIR = path.join(HOME, '.claude', 'commands');
const GLOBAL_SETTINGS_PATH = path.join(HOME, '.claude', 'settings.json');

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function readJsonSafe(filePath: string): any | null {
  const content = readFileSafe(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Parse skills from CLAUDE.md
 * Format: - `/name` — description
 */
function scanSkills(agentPath: string): AgentSkill[] {
  const claudeMd = readFileSafe(path.join(agentPath, 'CLAUDE.md'));
  if (!claudeMd) return [];

  const skills: AgentSkill[] = [];
  // Match lines like: - `/skill-name` — description
  // Support both fullwidth dash — and regular dash -
  const pattern = /^- `(\/[^`]+)`\s*(?:—|--|-)?\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  // Only parse within "可用 Skills" section
  const sectionMatch = claudeMd.match(/## 可用 Skills\n([\s\S]*?)(?=\n##|\n$|$)/);
  if (!sectionMatch) return [];

  const section = sectionMatch[1];
  while ((match = pattern.exec(section)) !== null) {
    skills.push({ name: match[1], description: match[2].trim() });
  }

  return skills;
}

/**
 * Scan .md files from a commands directory
 */
function scanCommandsFromDir(dir: string, source: 'global' | 'project'): AgentCommand[] {
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    return files.map(f => {
      const content = readFileSafe(path.join(dir, f));
      const firstLine = content?.split('\n')[0]?.trim() || '';
      return {
        name: '/' + f.replace(/\.md$/, ''),
        description: firstLine,
        source,
      };
    });
  } catch {
    return [];
  }
}

function scanCommands(agentPath: string): AgentCommand[] {
  const globalCmds = scanCommandsFromDir(GLOBAL_COMMANDS_DIR, 'global');
  const projectCmdsDir = path.join(agentPath, '.claude', 'commands');
  const projectCmds = scanCommandsFromDir(projectCmdsDir, 'project');
  return [...projectCmds, ...globalCmds];
}

/**
 * Parse MCP tools from settings.json permissions.allow
 * Format: mcp__serverName__toolName
 */
function scanMcpTools(agentPath: string): McpToolGroup[] {
  const groups = new Map<string, string[]>();

  function extractMcpTools(settingsPath: string) {
    const settings = readJsonSafe(settingsPath);
    if (!settings) return;

    const allowList: string[] = settings?.permissions?.allow || [];
    for (const entry of allowList) {
      if (typeof entry === 'string' && entry.startsWith('mcp__')) {
        const parts = entry.split('__');
        if (parts.length >= 3) {
          const serverName = parts[1];
          const toolName = parts.slice(2).join('__');
          if (!groups.has(serverName)) groups.set(serverName, []);
          groups.get(serverName)!.push(toolName);
        }
      }
    }
  }

  // Global settings
  extractMcpTools(GLOBAL_SETTINGS_PATH);
  // Project-level settings
  extractMcpTools(path.join(agentPath, '.claude', 'settings.json'));

  return Array.from(groups.entries()).map(([serverName, tools]) => ({
    serverName,
    toolCount: tools.length,
    tools: tools.sort(),
  }));
}

export function scanAgentCapabilities(agentId: string, agentPath: string): AgentCapabilities {
  return {
    agentId,
    skills: scanSkills(agentPath),
    commands: scanCommands(agentPath),
    mcpTools: scanMcpTools(agentPath),
    scannedAt: new Date().toISOString(),
  };
}
