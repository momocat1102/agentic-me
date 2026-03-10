#!/usr/bin/env node
/**
 * Central Command MCP Server
 *
 * Provides tools for Main Agent to manage progress, deadlines, and task records.
 * Runs in stdio mode, communicates with Central Command server via HTTP.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.CC_API_URL || 'http://localhost:4000/api';

async function fetchAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const server = new McpServer({
  name: 'central-command',
  version: '2.0.0',
});

// Tool 1: list_agents
server.tool(
  'list_agents',
  '列出所有可用的 Agent 及其當前狀態',
  {},
  async () => {
    const agents = await fetchAPI<any[]>('/agents');
    const summary = agents.map(a =>
      `- ${a.name} (${a.id}): ${a.status}${a.role ? ` — ${a.role}` : ''}`
    ).join('\n');

    return {
      content: [{
        type: 'text' as const,
        text: `可用 Agent (${agents.length} 個):\n${summary}`,
      }],
    };
  }
);

// Tool 2: get_task_history
server.tool(
  'get_task_history',
  '查詢任務歷史紀錄，可按 Agent 或專案篩選',
  {
    agentId: z.string().optional().describe('篩選特定 Agent 的任務，例如 "research-agent"'),
    project: z.string().optional().describe('篩選特定專案的任務，例如 "macs-paper"'),
    limit: z.number().optional().describe('回傳筆數上限，預設 10'),
  },
  async ({ agentId, project, limit }) => {
    const params = new URLSearchParams();
    if (agentId) params.set('agentId', agentId);
    if (project) params.set('project', project);
    params.set('limit', String(limit || 10));

    const tasks = await fetchAPI<any[]>(`/tasks?${params}`);

    if (tasks.length === 0) {
      return { content: [{ type: 'text' as const, text: '沒有任務紀錄。' }] };
    }

    const lines = tasks.map(t =>
      `- [${t.status}] ${t.agentId}${t.projectId ? ` (${t.projectId})` : ''} | ${t.prompt.slice(0, 80)}${t.prompt.length > 80 ? '...' : ''}\n  摘要: ${t.summary || '無'}\n  完成: ${t.completedAt || '未知'}`
    ).join('\n\n');

    return {
      content: [{
        type: 'text' as const,
        text: `任務歷史 (${tasks.length} 筆):\n\n${lines}`,
      }],
    };
  }
);

// Tool 3: report_task_completion
server.tool(
  'report_task_completion',
  '回報一個已完成的任務紀錄到 Central Command',
  {
    agentId: z.string().describe('完成任務的 Agent ID'),
    prompt: z.string().describe('原始任務描述'),
    summary: z.string().describe('任務結果摘要'),
    status: z.enum(['completed', 'failed']).optional().describe('任務狀態，預設 completed'),
    project: z.string().optional().describe('所屬專案 ID，如 "macs-paper"、"thesis"'),
  },
  async ({ agentId, prompt, summary, status, project }) => {
    const task = await fetchAPI<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        agentId, prompt, summary,
        status: status || 'completed',
        projectId: project,
      }),
    });

    return {
      content: [{
        type: 'text' as const,
        text: `任務已記錄。\n- ID: ${task.id}\n- Agent: ${agentId}\n- 專案: ${project || '無'}\n- 狀態: ${task.status}`,
      }],
    };
  }
);

// Tool 4: update_progress
server.tool(
  'update_progress',
  '更新專案進度。若 project 不存在則新建。',
  {
    project: z.string().describe('專案 ID，例如 "macs-paper"、"thesis"'),
    label: z.string().optional().describe('顯示名稱（新建時必填），例如 "MACS 會議論文"'),
    status: z.enum(['not_started', 'in_progress', 'draft', 'review', 'completed']).optional().describe('進度狀態'),
    progressPct: z.number().min(0).max(100).optional().describe('完成百分比 0-100'),
    description: z.string().optional().describe('進度描述或備註'),
  },
  async ({ project, label, status, progressPct, description }) => {
    // Check if project exists
    const existing = await fetchAPI<any[]>(`/progress?project=${encodeURIComponent(project)}`);
    const mainItem = existing.find((p: any) => p.project === project && !p.parentId);

    if (mainItem) {
      // Update existing
      const updates: any = {};
      if (status) updates.status = status;
      if (progressPct !== undefined) updates.progressPct = progressPct;
      if (description) updates.description = description;
      if (label) updates.label = label;

      const updated = await fetchAPI<any>(`/progress/${mainItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return {
        content: [{
          type: 'text' as const,
          text: `進度已更新：${updated.label}\n- 狀態: ${updated.status}\n- 完成度: ${updated.progressPct}%${updated.description ? `\n- 備註: ${updated.description}` : ''}`,
        }],
      };
    } else {
      // Create new
      if (!label) {
        return { content: [{ type: 'text' as const, text: '新建進度項目時 label 為必填。' }] };
      }

      const created = await fetchAPI<any>('/progress', {
        method: 'POST',
        body: JSON.stringify({
          project,
          label,
          status: status || 'not_started',
          progressPct: progressPct ?? 0,
          description,
        }),
      });

      return {
        content: [{
          type: 'text' as const,
          text: `進度已新建：${created.label}\n- 專案: ${created.project}\n- 狀態: ${created.status}\n- 完成度: ${created.progressPct}%`,
        }],
      };
    }
  }
);

// Tool 5: manage_deadline
server.tool(
  'manage_deadline',
  '管理截止日：新增、更新、或標記完成',
  {
    action: z.enum(['add', 'update', 'complete']).describe('操作類型'),
    id: z.string().optional().describe('Deadline ID（update/complete 時必填）'),
    title: z.string().optional().describe('標題（add 時必填）'),
    dueDate: z.string().optional().describe('截止日期 ISO 格式，例如 "2026-04-15"'),
    category: z.enum(['paper', 'meeting', 'report', 'other']).optional().describe('分類'),
    relatedProject: z.string().optional().describe('關聯的 progress project ID'),
    description: z.string().optional().describe('描述'),
  },
  async ({ action, id, title, dueDate, category, relatedProject, description }) => {
    if (action === 'add') {
      if (!title || !dueDate) {
        return { content: [{ type: 'text' as const, text: '新增 deadline 時 title 和 dueDate 為必填。' }] };
      }

      const deadline = await fetchAPI<any>('/deadlines', {
        method: 'POST',
        body: JSON.stringify({ title, dueDate, category, relatedProject, description }),
      });

      return {
        content: [{
          type: 'text' as const,
          text: `Deadline 已新增：${deadline.title}\n- 截止日: ${deadline.dueDate}\n- 分類: ${deadline.category}\n- ID: ${deadline.id}`,
        }],
      };
    }

    if (action === 'update') {
      if (!id) {
        return { content: [{ type: 'text' as const, text: 'update 操作需要提供 id。' }] };
      }

      const updates: any = {};
      if (title) updates.title = title;
      if (dueDate) updates.dueDate = dueDate;
      if (category) updates.category = category;
      if (relatedProject) updates.relatedProject = relatedProject;
      if (description) updates.description = description;

      const deadline = await fetchAPI<any>(`/deadlines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return {
        content: [{
          type: 'text' as const,
          text: `Deadline 已更新：${deadline.title}\n- 截止日: ${deadline.dueDate}\n- 狀態: ${deadline.status}`,
        }],
      };
    }

    if (action === 'complete') {
      if (!id) {
        return { content: [{ type: 'text' as const, text: 'complete 操作需要提供 id。' }] };
      }

      const deadline = await fetchAPI<any>(`/deadlines/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      });

      return {
        content: [{
          type: 'text' as const,
          text: `Deadline 已完成：${deadline.title}`,
        }],
      };
    }

    return { content: [{ type: 'text' as const, text: '未知的操作類型。' }] };
  }
);

// Tool 6: list_projects
server.tool(
  'list_projects',
  '列出所有專案及其當前狀態',
  {},
  async () => {
    const projects = await fetchAPI<any[]>('/projects');
    const summary = projects.map(p =>
      `- ${p.name} (${p.id}): ${p.status} | 任務: ${p.taskCount || 0} 筆 | 進度: ${p.progressPct ?? 0}%`
    ).join('\n');

    return {
      content: [{
        type: 'text' as const,
        text: `專案列表 (${projects.length} 個):\n${summary}`,
      }],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP Server error:', err);
  process.exit(1);
});
