'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, type Agent, type SpecsResponse, type ValidateResult } from '@/lib/api';
import { ProgressCard } from '@/components/ProgressCard';
import { DeadlineList } from '@/components/DeadlineList';
import { TaskHistory } from '@/components/TaskHistory';
import { ChangeTree } from '@/components/ChangeTree';
import { GitGraph } from '@/components/GitGraph';

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
  const [specsData, setSpecsData] = useState<SpecsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpecs, setExpandedSpecs] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<string | null>(null);
  const [showCreateChange, setShowCreateChange] = useState(false);
  const [newChangeName, setNewChangeName] = useState('');
  const [newChangeMotivation, setNewChangeMotivation] = useState('');
  const [newChangeTasks, setNewChangeTasks] = useState('');
  const [creating, setCreating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, agentData, specs] = await Promise.all([
        api.projects.summary(id),
        api.agents.list(),
        api.projects.specs(id).catch(() => null),
      ]);
      setData(summaryData);
      setAgents(agentData);
      setSpecsData(specs);
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
      <div className="flex items-center gap-3 flex-wrap">
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

      {/* Show old sections only if NO OpenSpec */}
      {!(specsData && specsData.hasOpenSpec) && (
        <>
          {/* Agent Participation */}
          {tasksByAgent && tasksByAgent.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">參與 Agent</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

          {/* Progress (Git Graph) */}
          {parentItems.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">進度追蹤</h2>
              <GitGraph
                items={parentItems.map((item: any) => ({
                  id: item.id, project: item.project, label: item.label,
                  category: item.category, status: item.status, progressPct: item.progress_pct,
                  description: item.description, parentId: item.parent_id, sortOrder: item.sort_order,
                  updatedAt: item.updated_at, updatedBy: item.updated_by, createdAt: item.created_at,
                }))}
                childrenMap={childrenMap}
              />
            </section>
          )}
        </>
      )}

      {/* OpenSpec — Full width layout */}
      {specsData && specsData.hasOpenSpec ? (
        <>
          <section>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Changes</h2>
                {specsData.source && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    specsData.source === 'cli'
                      ? 'bg-green-900/40 text-green-400 border border-green-700/30'
                      : 'bg-gray-800 text-gray-500 border border-gray-700/30'
                  }`}>
                    {specsData.source === 'cli' ? 'CLI' : 'FS'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setValidating(true);
                    try {
                      const result = await api.projects.validate(id);
                      setValidateResult(result);
                    } catch {
                      setValidateResult(null);
                    } finally {
                      setValidating(false);
                    }
                  }}
                  disabled={validating}
                  className="text-xs px-2.5 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {validating ? '驗證中...' : '✓ Validate'}
                </button>
                <button
                  onClick={() => setShowCreateChange(!showCreateChange)}
                  className="text-xs px-2.5 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  + New Change
                </button>
              </div>
            </div>

            {/* Validate result */}
            {validateResult && (
              <div className={`mb-3 rounded-lg border p-3 text-xs ${
                validateResult.summary.totals.failed === 0
                  ? 'border-green-700/30 bg-green-950/20 text-green-300'
                  : 'border-yellow-700/30 bg-yellow-950/20 text-yellow-300'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">
                    {validateResult.summary.totals.failed === 0 ? '✓ 全部通過' : `⚠ ${validateResult.summary.totals.failed}/${validateResult.summary.totals.items} 失敗`}
                  </span>
                  <button onClick={() => setValidateResult(null)} className="text-gray-500 hover:text-gray-300">✕</button>
                </div>
                {validateResult.items.filter(item => !item.valid).map(item => (
                  <div key={item.id} className="mt-1 pl-2 border-l border-yellow-700/30">
                    <span className="font-mono text-yellow-400">{item.id}</span>
                    {item.issues.map((issue, i) => (
                      <p key={i} className="text-[10px] text-gray-400 mt-0.5 truncate">{issue.message}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Create Change Form */}
            {showCreateChange && (
              <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Change name (kebab-case)"
                  value={newChangeName}
                  onChange={(e) => setNewChangeName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  placeholder="Motivation (optional)"
                  value={newChangeMotivation}
                  onChange={(e) => setNewChangeMotivation(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <textarea
                  placeholder="Tasks (one per line, optional)"
                  value={newChangeTasks}
                  onChange={(e) => setNewChangeTasks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!newChangeName.trim()) return;
                      setCreating(true);
                      try {
                        const tasks = newChangeTasks.split('\n').map(l => l.trim()).filter(Boolean);
                        await api.projects.createChange(id, {
                          name: newChangeName.trim(),
                          motivation: newChangeMotivation.trim() || undefined,
                          tasks: tasks.length > 0 ? tasks : undefined,
                        });
                        if (tasks.length > 0) {
                          await api.projects.importTasks(id, newChangeName.trim()).catch(() => {});
                        }
                        setNewChangeName('');
                        setNewChangeMotivation('');
                        setNewChangeTasks('');
                        setShowCreateChange(false);
                        fetchData();
                      } catch (err: unknown) {
                        alert(`建立失敗：${err instanceof Error ? err.message : String(err)}`);
                      } finally {
                        setCreating(false);
                      }
                    }}
                    disabled={creating || !newChangeName.trim()}
                    className="text-xs px-3 py-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    {creating ? '建立中...' : '建立'}
                  </button>
                  <button
                    onClick={() => setShowCreateChange(false)}
                    className="text-xs px-3 py-1.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            <ChangeTree
              changes={specsData.changes}
              archived={specsData.archived}
              onStatusChange={async (changeName, newStatus) => {
                try {
                  await api.projects.updateChangeStatus(id, changeName, newStatus);
                  fetchData();
                } catch (err: unknown) {
                  alert(`更新失敗：${err instanceof Error ? err.message : String(err)}`);
                }
              }}
              onImport={async (changeName) => {
                setImporting(changeName);
                try {
                  await api.projects.importTasks(id, changeName);
                  fetchData();
                } catch (err: unknown) {
                  alert(`同步失敗：${err instanceof Error ? err.message : String(err)}`);
                } finally {
                  setImporting(null);
                }
              }}
              importing={importing}
            />
          </section>

          {/* Specs — collapsible */}
          {specsData.specs.length > 0 && (
            <section>
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                  <span className="text-xs transition-transform group-open:rotate-90">▶</span>
                  Specs ({specsData.specs.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {specsData.specs.map((spec) => (
                    <div key={spec.name} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <button
                        onClick={() => {
                          const next = new Set(expandedSpecs);
                          if (next.has(spec.name)) next.delete(spec.name);
                          else next.add(spec.name);
                          setExpandedSpecs(next);
                        }}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {spec.name.replace('.md', '')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {expandedSpecs.has(spec.name) ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedSpecs.has(spec.name) && (
                        <div className="px-3 pb-3">
                          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800 rounded p-3 max-h-64 overflow-y-auto">
                            {spec.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </section>
          )}
        </>
      ) : specsData && !specsData.hasOpenSpec ? (
        <section className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">尚無 OpenSpec 結構</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs font-mono">執行 openspec init --tools claude 建立規格文件</p>
        </section>
      ) : null}

      {/* Deadlines + Recent Tasks */}
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
            <TaskHistory tasks={tasks.slice(0, 5)} agentNames={agentNames} />
          </div>
        </section>
      </div>
    </div>
  );
}
