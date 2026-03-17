// Use Next.js rewrite proxy in dev (avoids CORS), or direct URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (
  typeof window !== 'undefined'
    ? `ws://${window.location.hostname}:4001`
    : 'ws://localhost:4001'
);

// === Types ===
export interface Agent {
  id: string;
  name: string;
  role?: string;
  path: string;
  isOrchestrator?: boolean;
  status: 'idle' | 'offline';
  claudeVersion?: string;
  lastHealthCheck?: string;
}

export interface Task {
  id: string;
  agentId: string;
  projectId?: string;
  prompt: string;
  summary?: string;
  status: 'completed' | 'failed';
  dispatchedBy?: string;
  createdAt: string;
  completedAt?: string;
}

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  completedTaskCount?: number;
  progressPct?: number;
  participatingAgents?: string[];
}

export interface Progress {
  id: string;
  project: string;
  label: string;
  category: 'project' | 'milestone' | 'chapter';
  status: 'not_started' | 'in_progress' | 'draft' | 'review' | 'completed';
  progressPct: number;
  description?: string;
  parentId?: string;
  sortOrder: number;
  updatedAt: string;
  updatedBy: string;
  createdAt: string;
}

export interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  category: 'paper' | 'meeting' | 'report' | 'other';
  relatedProject?: string;
  description?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  status: 'upcoming' | 'overdue' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  summary: string;
  category: string;
  importance: string;
  effective_importance: number;
  tags: string[];
  entities: string[];
  project: string;
  session: string;
  token_count: number;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  feedback_score: number;
}

export interface MemoryStats {
  totalCount: number;
  projectCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  importanceCounts: Record<string, number>;
  edgeCounts: Record<string, number>;
}

export interface MemoryGraphData {
  nodes: MemoryEntry[];
  edges: { source_id: string; target_id: string; edge_type: string; weight: number }[];
}

export interface ServiceStatus {
  status: 'ok' | 'warning' | 'error';
  message?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  nodeVersion: string;
  services: {
    api: ServiceStatus;
    websocket: ServiceStatus;
    database: ServiceStatus;
    memcp: ServiceStatus;
  };
  agents: {
    total: number;
    online: number;
    offline: number;
    lastCheckTime: string | null;
  };
}

// === Log ===
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  module: string;
  message: string;
  data: string | null;
  timestamp: string;
}

export interface AgentEvent {
  id: string;
  taskId?: string;
  agentId: string;
  sessionId?: string;
  eventType: string;
  toolName?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

// === Schedule (Scheduled Tasks) ===
export type ScheduleType = 'task' | 'review';
export type ScheduleMode = 'single' | 'iterative';
export type ScheduleRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'skipped';

export type ScheduleFrequency = 'daily' | 'weekly' | 'once' | 'interval';

export interface Schedule {
  id: string;
  name: string;
  cronExpr: string;
  enabled: boolean;
  type: ScheduleType;
  mode: ScheduleMode;
  projectId: string;
  workDir: string;
  prompt: string;
  reviewPrompt?: string;
  safetyRules?: string;
  maxTurns: number;
  timeoutMs: number;
  frequency: ScheduleFrequency;
  startTime: string;
  dayOfWeek?: number;
  intervalHours?: number;
  windowStart?: string;
  windowEnd?: string;
  maxRounds?: number;
  currentRound: number;
  sessionDate?: string;
  consecutiveFailures: number;
  killConditions?: string;
  killReason?: string;
  createdAt: string;
  updatedAt: string;
  lastRun?: ScheduleRun | null;
  isRunning?: boolean;
}

export interface ScheduleRun {
  id: string;
  scheduleId: string;
  status: ScheduleRunStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  output?: string;
  error?: string;
  report?: string;
  exitCode?: number;
  roundNumber?: number;
  roundType?: 'task' | 'review';
  feedback?: string;
  createdAt: string;
  scheduleName?: string;
  scheduleType?: ScheduleType;
  scheduleMode?: ScheduleMode;
}

export interface ScheduleStatus {
  activeSchedules: number;
  registeredJobs: number;
  runningCount: number;
  lastRun: ScheduleRun | null;
}

// === API Client ===
async function fetchAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  health: {
    check: () => fetchAPI<SystemHealth>('/health'),
  },
  agents: {
    list: () => fetchAPI<Agent[]>('/agents'),
  },
  projects: {
    list: (status?: string) =>
      fetchAPI<Project[]>(`/projects${status ? `?status=${status}` : ''}`),
    get: (id: string) => fetchAPI<Project>(`/projects/${id}`),
    summary: (id: string) => fetchAPI<any>(`/projects/${id}/summary`),
    specs: (id: string) => fetchAPI<SpecsResponse>(`/projects/${id}/specs`),
    importTasks: (id: string, changeName: string) =>
      fetchAPI<ImportTasksResult>(`/projects/${id}/specs/import-tasks`, {
        method: 'POST',
        body: JSON.stringify({ changeName }),
      }),
    updateChangeStatus: (id: string, changeName: string, status: string) =>
      fetchAPI<{ ok: boolean; status: string }>(`/projects/${id}/specs/changes/${changeName}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    createChange: (id: string, input: { name: string; motivation?: string; tasks?: string[] }) =>
      fetchAPI<{ ok: boolean; name: string }>(`/projects/${id}/specs/changes`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    validate: (id: string) =>
      fetchAPI<ValidateResult>(`/projects/${id}/specs/validate`, { method: 'POST' }),
  },
  tasks: {
    list: (params?: { agentId?: string; project?: string; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        )
      ).toString();
      return fetchAPI<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => fetchAPI<Task>(`/tasks/${id}`),
    update: (
      id: string,
      input: { prompt?: string; summary?: string; status?: string; projectId?: string }
    ) => fetchAPI<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    delete: (id: string) => fetchAPI<void>(`/tasks/${id}`, { method: 'DELETE' }),
  },
  progress: {
    list: (project?: string) =>
      fetchAPI<Progress[]>(`/progress${project ? `?project=${project}` : ''}`),
    create: (input: {
      project: string;
      label: string;
      category?: string;
      status?: string;
      progressPct?: number;
      description?: string;
      parentId?: string;
    }) => fetchAPI<Progress>('/progress', { method: 'POST', body: JSON.stringify(input) }),
    update: (
      id: string,
      input: { label?: string; status?: string; progressPct?: number; description?: string }
    ) => fetchAPI<Progress>(`/progress/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    delete: (id: string) => fetchAPI<void>(`/progress/${id}`, { method: 'DELETE' }),
  },
  deadlines: {
    list: (status?: string) =>
      fetchAPI<Deadline[]>(`/deadlines${status ? `?status=${status}` : ''}`),
    create: (input: {
      title: string;
      dueDate: string;
      category?: string;
      relatedProject?: string;
      description?: string;
    }) => fetchAPI<Deadline>('/deadlines', { method: 'POST', body: JSON.stringify(input) }),
    update: (
      id: string,
      input: {
        title?: string;
        dueDate?: string;
        category?: string;
        status?: string;
        description?: string;
      }
    ) => fetchAPI<Deadline>(`/deadlines/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    delete: (id: string) => fetchAPI<void>(`/deadlines/${id}`, { method: 'DELETE' }),
  },
  memory: {
    list: (params?: { project?: string; category?: string; importance?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        )
      );
      return fetchAPI<MemoryEntry[]>(`/memory${qs.toString() ? `?${qs}` : ''}`);
    },
    search: (q: string, limit?: number) =>
      fetchAPI<MemoryEntry[]>(
        `/memory/search?q=${encodeURIComponent(q)}${limit ? `&limit=${limit}` : ''}`
      ),
    stats: () => fetchAPI<MemoryStats>('/memory/stats'),
    graph: (project?: string) =>
      fetchAPI<MemoryGraphData>(
        `/memory/graph${project ? `?project=${project}` : ''}`
      ),
  },
  logs: {
    list: (params?: { level?: string; module?: string; limit?: number; before?: string }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        )
      ).toString();
      return fetchAPI<LogEntry[]>(`/logs${qs ? `?${qs}` : ''}`);
    },
    modules: () => fetchAPI<string[]>('/logs/modules'),
    delete: (before?: string) =>
      fetchAPI<{ deleted: number }>(`/logs${before ? `?before=${before}` : ''}`, { method: 'DELETE' }),
  },
  schedules: {
    list: (type?: ScheduleType) =>
      fetchAPI<Schedule[]>(`/schedules${type ? `?type=${type}` : ''}`),
    create: (input: {
      name: string;
      mode?: ScheduleMode;
      projectId: string;
      workDir?: string;
      prompt: string;
      reviewPrompt?: string;
      safetyRules?: string;
      maxTurns?: number;
      timeoutMs?: number;
      frequency?: ScheduleFrequency;
      startTime?: string;
      dayOfWeek?: number;
      intervalHours?: number;
      windowStart?: string;
      windowEnd?: string;
      maxRounds?: number;
    }) => fetchAPI<Schedule>('/schedules', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: {
      name?: string;
      enabled?: boolean;
      mode?: ScheduleMode;
      projectId?: string;
      workDir?: string;
      prompt?: string;
      reviewPrompt?: string;
      safetyRules?: string;
      maxTurns?: number;
      timeoutMs?: number;
      frequency?: ScheduleFrequency;
      startTime?: string;
      dayOfWeek?: number;
      intervalHours?: number;
      windowStart?: string;
      windowEnd?: string;
      maxRounds?: number;
    }) => fetchAPI<Schedule>(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    delete: (id: string) => fetchAPI<void>(`/schedules/${id}`, { method: 'DELETE' }),
    resetRound: (id: string) =>
      fetchAPI<Schedule>(`/schedules/${id}/reset-round`, { method: 'POST' }),
    listRuns: (params?: { scheduleId?: string; status?: string; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        )
      ).toString();
      return fetchAPI<ScheduleRun[]>(`/schedules/runs${qs ? `?${qs}` : ''}`);
    },
    getRun: (id: string) => fetchAPI<ScheduleRun>(`/schedules/runs/${id}`),
    trigger: (scheduleId: string) =>
      fetchAPI<ScheduleRun>(`/schedules/${scheduleId}/trigger`, { method: 'POST' }),
    stopRun: (runId: string) =>
      fetchAPI<void>(`/schedules/runs/${runId}/stop`, { method: 'POST' }),
    status: () => fetchAPI<ScheduleStatus>('/schedules/status'),
    reportRound: (scheduleId: string, input: {
      roundNumber: number;
      status: 'completed' | 'failed';
      report?: string;
      feedback?: string;
    }) => fetchAPI<ScheduleRun>(`/schedules/${scheduleId}/report-round`, {
      method: 'POST', body: JSON.stringify(input),
    }),
    get: (id: string) => fetchAPI<Schedule>(`/schedules/${id}`),
    stopSession: (scheduleId: string) =>
      fetchAPI<{ stopped: boolean }>(`/schedules/${scheduleId}/stop-session`, { method: 'POST' }),
    launch: (scheduleId: string, budget?: number) =>
      fetchAPI<{ launched: boolean; sessionName: string; output: string }>(`/schedules/${scheduleId}/launch`, {
        method: 'POST', body: JSON.stringify({ budget: budget ?? 5 }),
      }),
  },
  events: {
    list: (params?: { taskId?: string; agentId?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return fetchAPI<AgentEvent[]>(`/events${qs ? `?${qs}` : ''}`);
    },
  },
};

// === WebSocket ===
// === OpenSpec Types ===
export interface SpecFile {
  name: string;
  content: string;
}

export interface SpecChange {
  name: string;
  status: string;
  hasProposal: boolean;
  proposalSummary: string | null;
  tasksStats: { total: number; completed: number } | null;
  rawTasksMd: string | null;
  lastModified?: string;
}

export type ArchivedChange = SpecChange;

export interface SpecsResponse {
  hasOpenSpec: boolean;
  specs: SpecFile[];
  changes: SpecChange[];
  archived?: ArchivedChange[];
  source?: 'cli' | 'fs';
}

export interface ValidateResult {
  items: { id: string; type: string; valid: boolean; issues: { level: string; path: string; message: string }[] }[];
  summary: { totals: { items: number; passed: number; failed: number } };
}

export interface ImportTasksResult {
  ok: boolean;
  imported: number;
  updated: number;
  total: number;
}

export type WSMessageType =
  | 'task_update'
  | 'event'
  | 'agent_status'
  | 'progress_update'
  | 'deadline_update'
  | 'project_update'
  | 'schedule_update'
  | 'agent:activity';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
}

export function createWebSocket(onMessage: (msg: WSMessage) => void): { close: () => void } {
  let stopped = false;
  let ws: WebSocket;

  function connect() {
    if (stopped) return;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      if (!stopped) setTimeout(connect, 5000);
      return;
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        onMessage(msg);
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      if (!stopped) setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      // Will trigger onclose, which handles reconnect
    };
  }

  connect();

  return {
    close() {
      stopped = true;
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
    },
  };
}
