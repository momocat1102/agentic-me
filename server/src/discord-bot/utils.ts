import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load channel map
const channelMapPath = path.join(__dirname, 'channel-map.json');
const channelMap: Record<string, { project: string; name: string }> = JSON.parse(
  readFileSync(channelMapPath, 'utf-8'),
);

const CC_BASE = process.env.CC_API_URL || 'http://localhost:4000';

export function getProjectFromChannel(channelId: string): string | null {
  return channelMap[channelId]?.project || null;
}

export async function fetchCC(path: string): Promise<any> {
  const res = await fetch(`${CC_BASE}${path}`);
  if (!res.ok) throw new Error(`CC API ${res.status}: ${path}`);
  return res.json();
}
