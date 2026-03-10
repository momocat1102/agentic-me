'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type Agent, type Task, type Project } from '@/lib/api';
import { TaskHistory } from '@/components/TaskHistory';

export default function TasksPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const params: { agentId?: string; project?: string } = {};
      if (agentFilter) params.agentId = agentFilter;
      if (projectFilter) params.project = projectFilter;

      const [agentData, projectData, taskData] = await Promise.all([
        api.agents.list(),
        api.projects.list(),
        api.tasks.list(Object.keys(params).length > 0 ? params : undefined),
      ]);
      setAgents(agentData);
      setProjects(projectData);
      setTasks(taskData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [agentFilter, projectFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const agentNames = Object.fromEntries(agents.map((a) => [a.id, a.name]));
  const projectNames = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">任務紀錄</h1>
        <div className="flex gap-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">全部專案</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">全部 Agent</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="text-center py-4">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            重試
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">載入中...</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <TaskHistory tasks={tasks} agentNames={agentNames} projectNames={projectNames} />
        </div>
      )}
    </div>
  );
}
