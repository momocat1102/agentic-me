import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs';
import { randomUUID } from 'crypto';

const execAsync = promisify(execCb);

// ── Channel Map ──────────────────────────────────────────────────────
const CHANNEL_MAP_PATH = resolve(import.meta.dirname, 'channel-map.json');

interface ChannelInfo {
  project: string;
  name: string;
}

let channelMap: Record<string, ChannelInfo> | null = null;

function getChannelMap(): Record<string, ChannelInfo> {
  if (!channelMap) {
    channelMap = JSON.parse(readFileSync(CHANNEL_MAP_PATH, 'utf-8'));
  }
  return channelMap!;
}

const PROJECT_DIRS: Record<string, string> = {
  'main-agent': '/mnt/d/WorkSpace/main-agent',
  'system-agent': '/mnt/d/WorkSpace/system-agent',
  'master-thesis': '/mnt/d/WorkSpace/master-thesis',
  'macs-coder': '/mnt/d/WorkSpace/macs-coder',
  'foxconn-report': '/mnt/d/WorkSpace/foxconn-report',
  'lab-weekly': '/mnt/d/WorkSpace/lab-weekly',
  'demo-project': '/mnt/d/WorkSpace/demo-project',
};

export function getProjectDir(channelId: string): string | null {
  const map = getChannelMap();
  const info = map[channelId];
  if (!info) return null;
  return PROJECT_DIRS[info.project] || null;
}

export function getProjectName(channelId: string): string | null {
  const map = getChannelMap();
  return map[channelId]?.project || null;
}

// ── tmux Session Management ──────────────────────────────────────────
const TMUX_SESSION = 'discord';
const MAX_MESSAGE_LENGTH = 4000;
const channelQueues = new Map<string, Promise<void>>();

interface SessionInfo {
  project: string;
  workDir: string;
  jsonlPath: string | null;
  pendingQuestion: { options: string[] } | null; // AskUserQuestion waiting for reply
}

const activeSessions = new Map<string, SessionInfo>();

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function tmux(cmd: string): Promise<string> {
  const { stdout } = await execAsync(`tmux ${cmd}`, { timeout: 10_000 });
  return stdout.trim();
}

/** Get Claude's project hash directory (e.g. /mnt/d/WorkSpace/x → -mnt-d-WorkSpace-x) */
function getClaudeProjectDir(workDir: string): string {
  const hash = workDir.replace(/\//g, '-');
  return resolve(process.env.HOME || '', '.claude/projects', hash);
}

/** List JSONL files sorted by mtime desc */
function listJsonlFiles(dir: string): { name: string; mtime: number }[] {
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({ name: f, mtime: statSync(resolve(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch { return []; }
}

/** Count non-empty lines in a file */
function countLines(filePath: string): number {
  try {
    return readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim()).length;
  } catch { return 0; }
}

// Global lock to prevent concurrent tmux session/window creation races
let tmuxLock: Promise<void> = Promise.resolve();

function withTmuxLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = tmuxLock;
  let resolve: () => void;
  tmuxLock = new Promise(r => { resolve = r; });
  return prev.then(fn).finally(() => resolve!());
}

/** Ensure tmux window exists with interactive Claude for this project */
async function ensureSession(project: string, workDir: string): Promise<SessionInfo> {
  // Fast path: already tracked AND window still exists
  const existing = activeSessions.get(project);
  if (existing) {
    try {
      const windows = await tmux(`list-windows -t ${TMUX_SESSION} -F '#{window_name}' 2>/dev/null`);
      if (windows.split('\n').map(l => l.trim()).includes(project)) {
        if (!existing.jsonlPath) {
          existing.jsonlPath = findLatestJsonl(workDir);
        }
        return existing;
      }
    } catch { /* session gone */ }
    activeSessions.delete(project);
  }

  // Serialize tmux mutations to prevent race conditions
  return withTmuxLock(async () => {
    // Re-check after acquiring lock (another call might have created it)
    try {
      const windows = await tmux(`list-windows -t ${TMUX_SESSION} -F '#{window_name}'`);
      if (windows.split('\n').map(l => l.trim()).includes(project)) {
        const session: SessionInfo = { project, workDir, jsonlPath: findLatestJsonl(workDir), pendingQuestion: null };
        activeSessions.set(project, session);
        return session;
      }
    } catch { /* session doesn't exist yet */ }

    const target = `${TMUX_SESSION}:${project}`;
    const claudeDir = getClaudeProjectDir(workDir);
    const beforeFiles = new Set(listJsonlFiles(claudeDir).map(f => f.name));

    // Create tmux session or window
    let sessionExists = false;
    try {
      await tmux(`has-session -t ${TMUX_SESSION}`);
      sessionExists = true;
    } catch { /* doesn't exist */ }

    if (!sessionExists) {
      await tmux(`new-session -d -s ${TMUX_SESSION} -n "${project}" -c "${workDir}"`);
    } else {
      // Find a free window index (avoid phantom index conflicts)
      const usedIndices = new Set<number>();
      try {
        const idxList = await tmux(`list-windows -t ${TMUX_SESSION} -F '#{window_index}'`);
        for (const idx of idxList.split('\n')) {
          const n = parseInt(idx.trim(), 10);
          if (!isNaN(n)) usedIndices.add(n);
        }
      } catch { /* */ }
      // Start from 10 to avoid low-index phantom conflicts
      let freeIdx = 10;
      while (usedIndices.has(freeIdx)) freeIdx++;
      await tmux(`new-window -t ${TMUX_SESSION}:${freeIdx} -n "${project}" -c "${workDir}"`);
    }

    // Verify window was created
    await sleep(500);
    try {
      await tmux(`select-window -t "${target}"`);
    } catch {
      throw new Error(`Failed to create tmux window for ${project}`);
    }

    // Start interactive Claude
    await tmux(`send-keys -t "${target}" "unset CLAUDECODE && claude --permission-mode bypassPermissions" Enter`);
    console.log(`[Bridge] Starting Claude in tmux for ${project}...`);

    // Wait for new JSONL session file to appear
    let jsonlPath: string | null = null;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const currentFiles = listJsonlFiles(claudeDir);
      const newFile = currentFiles.find(f => !beforeFiles.has(f.name));
      if (newFile) {
        jsonlPath = resolve(claudeDir, newFile.name);
        break;
      }
      if (currentFiles.length > 0 && currentFiles[0].mtime > Date.now() - 3000) {
        jsonlPath = resolve(claudeDir, currentFiles[0].name);
        break;
      }
    }

    if (!jsonlPath) {
      const files = listJsonlFiles(claudeDir);
      if (files.length) jsonlPath = resolve(claudeDir, files[0].name);
    }

    console.log(`[Bridge] Session JSONL: ${jsonlPath || '(not found)'}`);

    const session: SessionInfo = { project, workDir, jsonlPath, pendingQuestion: null };
    activeSessions.set(project, session);

    await sleep(3000);
    console.log(`[Bridge] Claude ready: ${project}`);
    return session;
  }); // end withTmuxLock
}

/** Find the most recently modified JSONL for a project (must be active within last 5 min) */
function findLatestJsonl(workDir: string): string | null {
  const claudeDir = getClaudeProjectDir(workDir);
  const files = listJsonlFiles(claudeDir);
  if (!files.length) return null;
  // Prefer recently active file (within last 5 min)
  const recent = files.find(f => f.mtime > Date.now() - 5 * 60_000);
  return resolve(claudeDir, (recent || files[0]).name);
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Send a message to Claude via tmux interactive session.
 * Queued per channel to prevent concurrent sends.
 */
export async function sendToClaude(
  channelId: string,
  message: string,
): Promise<string> {
  const projectDir = getProjectDir(channelId);
  if (!projectDir) throw new Error(`No project mapping for channel ${channelId}`);
  const project = getProjectName(channelId)!;

  const prev = channelQueues.get(channelId) || Promise.resolve();
  const current = prev.then(() => doSend(project, projectDir, message));
  channelQueues.set(channelId, current.then(() => {}, () => {}));
  return current;
}

/** Send message to tmux and capture response from JSONL */
async function doSend(project: string, workDir: string, message: string): Promise<string> {
  const session = await ensureSession(project, workDir);
  const target = `${TMUX_SESSION}:${project}`;

  // Refresh JSONL path (in case it changed)
  session.jsonlPath = findLatestJsonl(workDir);

  // Record line count BEFORE sending
  const startLines = session.jsonlPath ? countLines(session.jsonlPath) : 0;

  // Check if Claude is waiting for an AskUserQuestion reply
  if (session.pendingQuestion) {
    const options = session.pendingQuestion.options;
    session.pendingQuestion = null;

    const trimmed = message.trim();
    const num = parseInt(trimmed, 10);

    if (num >= 1 && num <= options.length) {
      // Navigate to the option using Down arrows (option 1 = already selected, 2 = 1 Down, etc.)
      for (let i = 1; i < num; i++) {
        await tmux(`send-keys -t "${target}" Down`);
        await sleep(100);
      }
      await tmux(`send-keys -t "${target}" Enter`);
    } else {
      // User typed free text → select "Type something" option (usually last-ish), then type
      // Find "Type something" option index
      const typeIdx = options.findIndex(o => /type something/i.test(o));
      if (typeIdx >= 0) {
        for (let i = 0; i < typeIdx; i++) {
          await tmux(`send-keys -t "${target}" Down`);
          await sleep(100);
        }
        await tmux(`send-keys -t "${target}" Enter`);
        await sleep(300);
      }
      // Type the free text
      const tmpFile = `/tmp/discord-bridge-${randomUUID()}`;
      writeFileSync(tmpFile, trimmed);
      try {
        await tmux(`load-buffer -b discord-input "${tmpFile}"`);
        await tmux(`paste-buffer -b discord-input -t "${target}" -d`);
        await tmux(`send-keys -t "${target}" Enter`);
      } finally {
        try { unlinkSync(tmpFile); } catch { /* */ }
      }
    }
  } else {
    // Normal message: type into Claude's input prompt
    let safeMsg = message.replace(/\n+/g, ' ').trim();
    if (safeMsg.length > MAX_MESSAGE_LENGTH) {
      safeMsg = safeMsg.slice(0, MAX_MESSAGE_LENGTH);
    }

    const tmpFile = `/tmp/discord-bridge-${randomUUID()}`;
    writeFileSync(tmpFile, safeMsg);
    try {
      await tmux(`load-buffer -b discord-input "${tmpFile}"`);
      await tmux(`paste-buffer -b discord-input -t "${target}" -d`);
      await tmux(`send-keys -t "${target}" Enter`);
    } finally {
      try { unlinkSync(tmpFile); } catch { /* */ }
    }
  }

  console.log(`[Bridge] Sent to ${project} (${message.length} chars)`);

  // Wait for JSONL file to appear (Claude might still be starting up)
  if (!session.jsonlPath) {
    console.log(`[Bridge] Waiting for JSONL session file...`);
    for (let i = 0; i < 60; i++) { // up to 60s
      await sleep(1000);
      session.jsonlPath = findLatestJsonl(workDir);
      if (session.jsonlPath) {
        console.log(`[Bridge] Found JSONL: ${session.jsonlPath}`);
        break;
      }
    }
    if (!session.jsonlPath) {
      throw new Error('Claude 啟動逾時，找不到 session 檔案');
    }
  }

  // Wait for response from JSONL
  try {
    const result = await waitForJsonlResponse(session.jsonlPath, startLines);
    if (result.questionOptions) {
      session.pendingQuestion = { options: result.questionOptions };
    }
    return result.text;
  } catch (err) {
    console.error(`[Bridge] JSONL wait failed:`, err);
    // JSONL path might have changed (new session). Try refreshing.
    const refreshed = findLatestJsonl(workDir);
    if (refreshed && refreshed !== session.jsonlPath) {
      session.jsonlPath = refreshed;
      const result = await waitForJsonlResponse(session.jsonlPath, 0);
      if (result.questionOptions) {
        session.pendingQuestion = { options: result.questionOptions };
      }
      return result.text;
    }
    throw err;
  }
}

interface JsonlResult {
  text: string;
  questionOptions: string[] | null;
}

/** Wait for a completed assistant response in the JSONL file (no timeout — waits until end_turn or AskUserQuestion) */
async function waitForJsonlResponse(jsonlPath: string, startLines: number): Promise<JsonlResult> {
  let lastLineCount = startLines;
  let stableSeconds = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await sleep(1000);

    let lines: string[];
    try {
      lines = readFileSync(jsonlPath, 'utf-8').split('\n').filter(l => l.trim());
    } catch {
      continue;
    }

    const currentCount = lines.length;
    if (currentCount === lastLineCount) {
      stableSeconds++;
    } else {
      stableSeconds = 0;
      lastLineCount = currentCount;
    }

    // Check new lines for completed assistant response
    if (currentCount > startLines) {
      const newLines = lines.slice(startLines);
      const result = extractCompletedResponse(newLines);
      if (result !== null) {
        return result;
      }

      // Fallback: JSONL stable for 60s with new content (Claude might be thinking)
      if (stableSeconds >= 60) {
        const fallback = extractAllAssistantText(newLines);
        return { text: fallback || '(回應完成)', questionOptions: null };
      }
    }
  }
}

/**
 * Check if the conversation turn is complete and extract response.
 * Handles:
 * - stop_reason: "end_turn" → normal completed response
 * - stop_reason: "tool_use" with AskUserQuestion → format question for Discord
 */
function extractCompletedResponse(jsonlLines: string[]): JsonlResult | null {
  // Find the LAST assistant message
  let lastAssistantIdx = -1;
  for (let i = jsonlLines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(jsonlLines[i]);
      if (entry.type === 'assistant') {
        lastAssistantIdx = i;
        break;
      }
    } catch { /* skip */ }
  }

  if (lastAssistantIdx === -1) return null;

  try {
    const last = JSON.parse(jsonlLines[lastAssistantIdx]);
    const stopReason = last.message?.stop_reason;
    const content = last.message?.content;

    // Check: no pending user messages after this assistant message
    for (let i = lastAssistantIdx + 1; i < jsonlLines.length; i++) {
      try {
        const entry = JSON.parse(jsonlLines[i]);
        if (entry.type === 'user') return null; // tool_result pending, still processing
      } catch { /* skip */ }
    }

    // Case 1: Normal completed response
    if (stopReason === 'end_turn') {
      return { text: extractAllAssistantText(jsonlLines), questionOptions: null };
    }

    // Case 2: AskUserQuestion — format question + options for Discord
    if (stopReason === 'tool_use' && Array.isArray(content)) {
      const askTool = content.find(
        (c: any) => c.type === 'tool_use' && c.name === 'AskUserQuestion'
      );
      if (askTool) {
        const options: string[] = askTool.input?.options || [];
        return { text: formatAskQuestion(jsonlLines, askTool.input), questionOptions: options };
      }
    }

    // Other tool_use (not AskUserQuestion) — still processing, wait
    return null;
  } catch {
    return null;
  }
}

/** Format AskUserQuestion tool_use as Discord-friendly text */
function formatAskQuestion(jsonlLines: string[], input: any): string {
  const parts: string[] = [];

  // Include any preceding text from all assistant messages
  const text = extractAllAssistantText(jsonlLines);
  if (text) parts.push(text);

  // Format the question
  const question = input?.question || input?.text || '';
  if (question) parts.push(`**${question}**`);

  // Format options as numbered list
  const options: string[] = input?.options || [];
  if (options.length > 0) {
    const formatted = options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
    parts.push(formatted);
    parts.push('_（回覆數字選擇，或直接輸入文字）_');
  }

  return parts.join('\n\n');
}

/** Collect text content from all assistant messages in the given lines */
function extractAllAssistantText(jsonlLines: string[]): string {
  const texts: string[] = [];
  for (const line of jsonlLines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'text' && block.text) {
            texts.push(block.text);
          }
        }
      }
    } catch { /* skip */ }
  }
  return texts.join('\n\n').trim();
}

// ── Discord Message Splitting ────────────────────────────────────────
const DISCORD_MAX_LENGTH = 2000;

export function splitMessage(text: string): string[] {
  if (text.length <= DISCORD_MAX_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= DISCORD_MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }

    let splitIdx = remaining.lastIndexOf('\n', DISCORD_MAX_LENGTH);
    if (splitIdx < DISCORD_MAX_LENGTH * 0.5) {
      splitIdx = remaining.lastIndexOf(' ', DISCORD_MAX_LENGTH);
    }
    if (splitIdx < DISCORD_MAX_LENGTH * 0.3) {
      splitIdx = DISCORD_MAX_LENGTH;
    }

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }

  return chunks;
}
