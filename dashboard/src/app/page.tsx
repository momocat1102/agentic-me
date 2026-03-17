'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  api,
  createWebSocket,
  type Agent,
  type Task,
  type Project,
  type Deadline,
  type MemoryStats,
  type WSMessage,
} from '@/lib/api';
import { DeadlineList } from '@/components/DeadlineList';
import { TaskHistory } from '@/components/TaskHistory';
import { SystemHealthPanel } from '@/components/SystemHealthPanel';

export default function OverviewPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [agentData, taskData, projectData, deadlineData, statsData] = await Promise.all([
        api.agents.list(),
        api.tasks.list({ limit: 10 }),
        api.projects.list(),
        api.deadlines.list(),
        api.memory.stats(),
      ]);
      setAgents(agentData);
      setTasks(taskData);
      setProjects(projectData);
      setDeadlines(deadlineData);
      setMemoryStats(statsData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const ws = createWebSocket((msg: WSMessage) => {
      switch (msg.type) {
        case 'task_update':
          setTasks((prev) => {
            const updated = msg.payload as Task;
            const idx = prev.findIndex((t) => t.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [updated, ...prev].slice(0, 10);
          });
          break;
        case 'agent_status':
          setAgents((prev) =>
            prev.map((a) => {
              const update = msg.payload as { agentId: string; status: string; claudeVersion?: string };
              if (a.id === update.agentId) {
                return { ...a, status: update.status as Agent['status'], claudeVersion: update.claudeVersion };
              }
              return a;
            })
          );
          break;
        case 'project_update':
          fetchData();
          break;
        case 'deadline_update':
          setDeadlines((prev) => {
            const updated = msg.payload as Deadline;
            const idx = prev.findIndex((d) => d.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [...prev, updated];
          });
          break;
      }
    });

    const interval = setInterval(fetchData, 30000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [fetchData]);

  const agentNames = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-lg">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-red-500 text-lg">連線失敗</div>
        <p className="text-gray-400 text-sm">
          請確認 Central Command Server 已啟動（在 central-command/ 執行 npm run dev）
        </p>
        <p className="text-gray-500 text-xs font-mono">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重試
        </button>
      </div>
    );
  }

  // Stats
  const upcomingDeadlines = deadlines.filter((d) => d.status === 'upcoming' || d.status === 'overdue');
  const activeProjects = projects.filter((p) => p.status === 'active');
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const completedThisWeek = tasks.filter(
    (t) => t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= weekAgo
  ).length;

  // Upcoming deadlines (sorted, first 5)
  const upcomingSorted = [...upcomingDeadlines]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="即將到期" value={upcomingDeadlines.length} color="orange" />
        <StatCard label="進行中專案" value={activeProjects.length} color="blue" />
        <StatCard label="本週完成任務" value={completedThisWeek} color="green" />
        <StatCard label="記憶庫總數" value={memoryStats?.totalCount || 0} />
      </div>

      {/* Projects */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">專案</h2>
          <Link href="/projects" className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400">
            管理
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            目前沒有專案，使用 <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">/kickoff</code> 建立
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <ProjectAccordion key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* System Health */}
      <SystemHealthPanel />

      {/* Two-column: Deadlines + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">即將到期</h2>
          <DeadlineList deadlines={upcomingSorted} compact />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">最近活動</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <TaskHistory tasks={tasks.slice(0, 10)} agentNames={agentNames} />
          </div>
        </section>
      </div>
    </div>
  );
}

interface ProgressItem {
  id: string;
  label: string;
  category: string;
  status: string;
  description?: string;
  progress_pct: number;
  parent_id?: string;
  sort_order: number;
}

function ProjectAccordion({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<ProgressItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!expanded && items === null) {
      setLoading(true);
      try {
        const data = await api.projects.summary(project.id);
        setItems(data.progressItems || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  // Parse items into groups
  const projectItem = items?.find((i) => i.category === 'project');
  const milestones = items?.filter((i) => i.category !== 'project') || [];
  const completed = milestones.filter((i) => i.status === 'completed');
  const planned = milestones.filter((i) => i.status !== 'completed');
  const goal = projectItem?.description;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700">
      <button
        onClick={toggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{project.name}</h3>
          {project.description && (
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:inline">{project.description}</span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-4">
          {loading ? (
            <p className="text-xs text-gray-400">載入中...</p>
          ) : (
            <>
              {/* Goal */}
              {goal && (
                <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">最終目標</p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">{goal}</p>
                </div>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">已完成</p>
                  <div className="space-y-1">
                    {completed.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className="text-green-500 text-xs">{'\u2713'}</span>
                        <span className="text-gray-500 dark:text-gray-400 line-through">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Planned */}
              {planned.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">待完成</p>
                  <div className="space-y-1">
                    {planned.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className={`text-xs ${item.status === 'in_progress' ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>
                          {item.status === 'in_progress' ? '\u25B6' : '\u25CB'}
                        </span>
                        <span className={`${item.status === 'in_progress' ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                          {item.label}
                        </span>
                        {item.status === 'in_progress' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            進行中
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {milestones.length === 0 && !goal && (
                <p className="text-xs text-gray-400">尚無進度項目</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: string;
}) {
  const textColor =
    color === 'blue'
      ? 'text-blue-600 dark:text-blue-400'
      : color === 'green'
        ? 'text-green-600 dark:text-green-400'
        : color === 'orange'
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textColor}`}>{value}</p>
    </div>
  );
}
