// === Agent ===
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

// === Project ===
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  id: string;
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

// === Task (read-only history) ===
export type TaskStatus = 'completed' | 'failed';

export interface Task {
  id: string;
  agentId: string;
  projectId?: string;
  prompt: string;
  summary?: string;
  status: TaskStatus;
  dispatchedBy?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RecordTaskInput {
  agentId: string;
  prompt: string;
  summary: string;
  status?: TaskStatus;
  projectId?: string;
}

// === Progress ===
export type ProgressStatus = 'not_started' | 'in_progress' | 'draft' | 'review' | 'completed';
export type ProgressCategory = 'project' | 'milestone' | 'chapter';

export interface Progress {
  id: string;
  project: string;
  label: string;
  category: ProgressCategory;
  status: ProgressStatus;
  progressPct: number;
  description?: string;
  parentId?: string;
  sortOrder: number;
  updatedAt: string;
  updatedBy: string;
  createdAt: string;
}

export interface CreateProgressInput {
  project: string;
  label: string;
  category?: ProgressCategory;
  status?: ProgressStatus;
  progressPct?: number;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateProgressInput {
  label?: string;
  status?: ProgressStatus;
  progressPct?: number;
  description?: string;
  sortOrder?: number;
}

// === Deadline ===
export type DeadlineCategory = 'paper' | 'meeting' | 'report' | 'other';
export type DeadlineStatus = 'upcoming' | 'overdue' | 'completed';

export interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  category: DeadlineCategory;
  relatedProject?: string;
  description?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  status: DeadlineStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeadlineInput {
  title: string;
  dueDate: string;
  category?: DeadlineCategory;
  relatedProject?: string;
  description?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface UpdateDeadlineInput {
  title?: string;
  dueDate?: string;
  category?: DeadlineCategory;
  relatedProject?: string;
  description?: string;
  status?: DeadlineStatus;
}

// === Memory (read-only from LanceDB) ===
export interface MemoryEntry {
  id: string;
  text: string;
  category: string;
  scope: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

// === Agent Event ===
export type EventType = 'SessionStart' | 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SessionEnd';

export interface AgentEvent {
  id: string;
  taskId?: string;
  agentId: string;
  sessionId?: string;
  eventType: EventType;
  toolName?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

// === Agent Activity ===
export type AgentActivityStatus = 'working' | 'idle' | 'offline';

export interface AgentActivity {
  agentId: string;
  agentName: string;
  status: AgentActivityStatus;
  lastActiveAt: string | null;
  currentProject: string | null;
  currentSessionId: string | null;
}

// === WebSocket Messages ===
export type WSMessageType = 'task_update' | 'task_delete' | 'event' | 'agent_status' | 'progress_update' | 'deadline_update' | 'project_update' | 'schedule_update' | 'agent:activity';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
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
}

export interface CreateScheduleInput {
  name: string;
  mode?: ScheduleMode;
  projectId: string;
  workDir?: string;
  prompt: string;
  reviewPrompt?: string;
  safetyRules?: string;
  killConditions?: string;
  maxTurns?: number;
  timeoutMs?: number;
  frequency?: ScheduleFrequency;
  startTime: string;
  dayOfWeek?: number;
  intervalHours?: number;
  windowStart?: string;
  windowEnd?: string;
  maxRounds?: number;
}

export interface UpdateScheduleInput {
  name?: string;
  enabled?: boolean;
  mode?: ScheduleMode;
  projectId?: string;
  workDir?: string;
  prompt?: string;
  reviewPrompt?: string;
  safetyRules?: string;
  killConditions?: string;
  maxTurns?: number;
  timeoutMs?: number;
  frequency?: ScheduleFrequency;
  startTime?: string;
  dayOfWeek?: number;
  intervalHours?: number;
  windowStart?: string;
  windowEnd?: string;
  maxRounds?: number;
}

// === Config for agents.json ===
export interface AgentsConfig {
  agents: Array<{
    id: string;
    name: string;
    role?: string;
    path: string;
    isOrchestrator?: boolean;
  }>;
}
