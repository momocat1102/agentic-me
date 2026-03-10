import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AgentsConfig } from './types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  port: parseInt(process.env.PORT || '4000', 10),
  wsPort: parseInt(process.env.WS_PORT || '4001', 10),
  agentsConfigPath: process.env.AGENTS_CONFIG_PATH || path.resolve(__dirname, '../../agents.json'),
  healthCheckIntervalMs: 30_000,
  memcpDataDir: process.env.MEMCP_DATA_DIR || path.join(os.homedir(), '.memcp'),
};

export function loadAgentsConfig(): AgentsConfig {
  const raw = fs.readFileSync(CONFIG.agentsConfigPath, 'utf-8');
  return JSON.parse(raw) as AgentsConfig;
}
