'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, type Project, type Agent } from '@/lib/api';

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const statusLabels: Record<string, string> = {
  active: '進行中',
  paused: '暫停',
  completed: '已完成',
  archived: '已封存',
};

const progressBarColors: Record<string, string> = {
  active: 'bg-blue-500',
  paused: 'bg-yellow-500',
  completed: 'bg-green-500',
  archived: 'bg-gray-400',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [projectData, agentData] = await Promise.all([
        api.projects.list(),
        api.agents.list(),
      ]);
      setProjects(projectData);
      setAgents(agentData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

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
        <div className="text-red-500 text-lg">連線失敗</div>
        <p className="text-gray-500 text-xs font-mono">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">專案管理</h1>

      {projects.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">目前沒有專案</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:bg-gray-900 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{project.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[project.status] || ''}`}>
                    {statusLabels[project.status] || project.status}
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{project.description}</p>
                )}

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>進度</span>
                    <span>{project.progressPct ?? 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressBarColors[project.status] || 'bg-blue-500'}`}
                      style={{ width: `${project.progressPct ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>任務: {project.completedTaskCount ?? 0}/{project.taskCount ?? 0}</span>
                  {project.participatingAgents && project.participatingAgents.length > 0 && (
                    <span>
                      Agent: {project.participatingAgents.map(id => agentNames[id] || id).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
