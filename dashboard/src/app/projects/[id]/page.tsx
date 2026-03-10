'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, type Agent } from '@/lib/api';
import { ProgressCard } from '@/components/ProgressCard';
import { DeadlineList } from '@/components/DeadlineList';
import { TaskHistory } from '@/components/TaskHistory';

const projectStatusLabels: Record<string, string> = {
  active: '進行中',
  paused: '暫停',
  completed: '已完成',
  archived: '已封存',
};

const projectStatusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, agentData] = await Promise.all([
        api.projects.summary(id),
        api.agents.list(),
      ]);
      setData(summaryData);
      setAgents(agentData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const agentNames = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  if (loading) {
    return <div className="text-center py-8 text-gray-400">載入中...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="text-red-500 text-lg">載入失敗</div>
        <p className="text-gray-500 text-xs font-mono">{error}</p>
        <Link href="/projects" className="text-blue-500 hover:underline text-sm">返回專案列表</Link>
      </div>
    );
  }

  const { project, tasksByAgent, recentTasks, progressItems, deadlines } = data;

  // Build parent-children map for progress
  const parentItems = (progressItems || []).filter((p: any) => !p.parent_id);
  const childrenMap: Record<string, any[]> = {};
  (progressItems || [])
    .filter((p: any) => p.parent_id)
    .forEach((p: any) => {
      if (!childrenMap[p.parent_id]) childrenMap[p.parent_id] = [];
      childrenMap[p.parent_id].push({
        id: p.id,
        project: p.project,
        label: p.label,
        category: p.category,
        status: p.status,
        progressPct: p.progress_pct,
        description: p.description,
        parentId: p.parent_id,
        sortOrder: p.sort_order,
        updatedAt: p.updated_at,
        updatedBy: p.updated_by,
        createdAt: p.created_at,
      });
    });

  // Convert raw DB rows to Task format for TaskHistory
  const tasks = (recentTasks || []).map((t: any) => ({
    id: t.id,
    agentId: t.agent_id,
    projectId: t.project_id,
    prompt: t.prompt,
    summary: t.summary,
    status: t.status,
    createdAt: t.created_at,
    completedAt: t.completed_at,
  }));

  // Convert raw DB rows to Deadline format
  const deadlineList = (deadlines || []).map((d: any) => ({
    id: d.id,
    title: d.title,
    dueDate: d.due_date,
    category: d.category,
    relatedProject: d.related_project,
    description: d.description,
    isRecurring: d.is_recurring,
    status: d.status,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
          &larr; 專案
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${projectStatusColors[project.status] || ''}`}>
          {projectStatusLabels[project.status] || project.status}
        </span>
      </div>

      {project.description && (
        <p className="text-gray-500 dark:text-gray-400">{project.description}</p>
      )}

      {/* Agent Participation */}
      {tasksByAgent && tasksByAgent.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">參與 Agent</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tasksByAgent.map((a: any) => (
              <div key={a.agent_id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {agentNames[a.agent_id] || a.agent_id}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {a.completed}/{a.task_count} 任務完成
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Progress */}
      {parentItems.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">進度追蹤</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parentItems.map((item: any) => {
              const progressItem = {
                id: item.id,
                project: item.project,
                label: item.label,
                category: item.category,
                status: item.status,
                progressPct: item.progress_pct,
                description: item.description,
                parentId: item.parent_id,
                sortOrder: item.sort_order,
                updatedAt: item.updated_at,
                updatedBy: item.updated_by,
                createdAt: item.created_at,
              };
              return (
                <ProgressCard
                  key={item.id}
                  item={progressItem}
                  children={childrenMap[item.id]}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Two-column: Deadlines + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deadlineList.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">截止日</h2>
            <DeadlineList deadlines={deadlineList} compact />
          </section>
        )}

        <section className={deadlineList.length === 0 ? 'lg:col-span-2' : ''}>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">近期任務</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <TaskHistory tasks={tasks} agentNames={agentNames} />
          </div>
        </section>
      </div>
    </div>
  );
}
