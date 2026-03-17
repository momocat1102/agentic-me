'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, createWebSocket } from '@/lib/api';
import type { Schedule, ScheduleRun, ScheduleStatus, Project } from '@/lib/api';
import ScheduleForm from '@/components/ScheduleForm';
import RunReport from '@/components/RunReport';

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  timeout: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  skipped: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const MODE_BADGES: Record<string, { label: string; color: string }> = {
  single: { label: '單次', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  iterative: { label: '迭代', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
};

const ROUND_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  task: { label: 'Task', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  review: { label: 'Review', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
};

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDuration(ms?: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTime(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function scheduleTimeLabel(schedule: Schedule): string {
  if (schedule.mode === 'iterative') {
    const window = `${schedule.windowStart || '22:00'}-${schedule.windowEnd || '06:00'}`;
    const interval = schedule.intervalHours ? `每${schedule.intervalHours}h` : '';
    return `${window} ${interval}`;
  }
  const time = schedule.startTime || '02:00';
  switch (schedule.frequency) {
    case 'weekly':
      return `每週${DAY_LABELS[schedule.dayOfWeek ?? 0]} ${time}`;
    case 'once':
      return `單次 ${time}`;
    case 'daily':
    default:
      return `每天 ${time}`;
  }
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [runs, setRuns] = useState<ScheduleRun[]>([]);
  const [status, setStatus] = useState<ScheduleStatus | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<{ sessionName: string; scheduleId: string } | null>(null);
  const [launchCommand, setLaunchCommand] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [s, r, st, p] = await Promise.all([
        api.schedules.list(),
        api.schedules.listRuns({ limit: 30 }),
        api.schedules.status(),
        api.projects.list(),
      ]);
      setSchedules(s);
      setRuns(r);
      setStatus(st);
      setProjects(p);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const ws = createWebSocket((msg) => {
      if (msg.type === 'schedule_update') fetchData();
    });
    return () => ws.close();
  }, [fetchData]);

  const handleFormSubmit = async (input: any) => {
    if (editingSchedule) {
      await api.schedules.update(editingSchedule.id, input);
    } else {
      await api.schedules.create(input);
    }
    setShowForm(false);
    setEditingSchedule(null);
    fetchData();
  };

  const handleStopNightShift = async (schedule: Schedule, force: boolean = false) => {
    setStoppingId(schedule.id);
    try {
      if (force) {
        await api.schedules.stopSession(schedule.id);
      }
      await api.schedules.update(schedule.id, { enabled: false });
      fetchData();
    } catch {
      // At minimum the enabled flag should work
    } finally {
      setStoppingId(null);
    }
  };

  const handleLaunchNightShift = async (schedule: Schedule) => {
    setLaunchingId(schedule.id);
    try {
      const res = await api.schedules.launch(schedule.id);
      setLaunchResult({ sessionName: res.sessionName, scheduleId: schedule.id });
      fetchData();
    } catch (err: any) {
      const cmd = `tmux new-session -d -s "night-${schedule.id.slice(0, 8)}" "env -u CLAUDECODE claude --dangerously-skip-permissions --max-budget-usd 5" && sleep 3 && tmux send-keys -t "night-${schedule.id.slice(0, 8)}" '/night-shift ${schedule.id}' Enter`;
      setLaunchCommand(cmd);
      setCopied(false);
    } finally {
      setLaunchingId(null);
    }
  };

  const handleCopyCommand = async () => {
    if (launchCommand) {
      await navigator.clipboard.writeText(launchCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggle = async (schedule: Schedule) => {
    await api.schedules.update(schedule.id, { enabled: !schedule.enabled });
    fetchData();
  };

  const handleResetRound = async (id: string) => {
    await api.schedules.resetRound(id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此排程？所有執行紀錄也會一併刪除。')) return;
    await api.schedules.delete(id);
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">載入中...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400">連線失敗：{error}</p>
        <p className="text-sm text-gray-500 mt-1">請確認 Central Command Server 已啟動</p>
        <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">排程任務</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {showGuide ? '收起說明' : '使用說明'}
          </button>
          <button
            onClick={() => { setEditingSchedule(null); setShowForm(!showForm); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            {showForm ? '取消' : '+ 新增排程'}
          </button>
        </div>
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">如何使用夜班排程</h3>
          <div className="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
            <p><strong>1. 建立排程：</strong>點擊「+ 新增排程」，設定任務內容、專案、頻率和時間。</p>
            <p><strong>2. 定時執行：</strong>系統會在指定時間自動開啟 tmux session 執行夜班任務。</p>
            <p><strong>3. 手動啟動：</strong>也可以點「啟動夜班」立即執行，不等定時觸發。</p>
            <p><strong>4. 監控進度：</strong>執行中的任務會即時回報到此頁面的「執行歷史」區塊。</p>
          </div>
          <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800 space-y-1">
            <p className="text-xs text-indigo-600 dark:text-indigo-400"><strong>停止：</strong>「本輪後停止」等當前輪完成 / 「強制停止」立即終止 tmux</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400"><strong>查看輸出：</strong><code className="bg-white/60 dark:bg-black/20 px-1 rounded font-mono">tmux attach -t night-xxxxxxxx</code></p>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <ScheduleForm
          projects={projects}
          initial={editingSchedule}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingSchedule(null); }}
        />
      )}

      {/* Status Panel */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-blue-600">{status.activeSchedules}</div>
            <div className="text-sm text-gray-500">啟用中排程</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-green-600">{status.runningCount}</div>
            <div className="text-sm text-gray-500">執行中</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-sm text-gray-500">最近執行</div>
            {status.lastRun ? (
              <div className="mt-1">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status.lastRun.status] || ''}`}>
                  {status.lastRun.status}
                </span>
                <span className="text-xs text-gray-400 ml-2">{formatTime(status.lastRun.completedAt || status.lastRun.startedAt)}</span>
              </div>
            ) : (
              <div className="text-sm text-gray-400 mt-1">尚無紀錄</div>
            )}
          </div>
        </div>
      )}

      {/* Schedules List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">排程列表</h2>
        </div>
        {schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-400">尚無排程，點擊「+ 新增排程」建立</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {schedules.map((s) => {
              const modeInfo = MODE_BADGES[s.mode] || MODE_BADGES.single;
              const projectName = projects.find(p => p.id === s.projectId)?.name || s.projectId;
              return (
                <div key={s.id} className="px-5 py-3 flex items-start sm:items-center gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${modeInfo.color}`}>{modeInfo.label}</span>
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(s)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${s.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        title={s.enabled ? '點擊停用定時' : '點擊啟用定時'}
                      >
                        <span className={`block w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${s.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="font-medium text-gray-900 dark:text-white truncate">{s.name}</span>
                      {s.mode === 'iterative' && (
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-mono">
                          R{s.currentRound}{s.maxRounds ? `/${s.maxRounds}` : ''}
                        </span>
                      )}
                      {s.killReason && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" title={s.killReason}>
                          Circuit Breaker
                        </span>
                      )}
                      {!s.killReason && s.consecutiveFailures > 0 && (
                        <span className="text-xs text-orange-500 dark:text-orange-400 font-mono" title={`連續失敗 ${s.consecutiveFailures} 次，${3 - s.consecutiveFailures} 次後觸發 Circuit Breaker`}>
                          {s.consecutiveFailures}/3
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {scheduleTimeLabel(s)} · {projectName}
                      {s.lastRun && (
                        <span className="ml-2">
                          · 上次：
                          <span className={`inline-block px-1.5 py-0 rounded text-xs ${STATUS_COLORS[s.lastRun.status] || ''}`}>
                            {s.lastRun.status}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Reset Round (iterative only) */}
                    {s.mode === 'iterative' && s.currentRound > 0 && !s.isRunning && (
                      <button
                        onClick={() => handleResetRound(s.id)}
                        className="px-3 py-1 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800"
                        title="重置輪次計數器"
                      >
                        重置
                      </button>
                    )}
                    {s.isRunning ? (
                      <>
                        <button
                          onClick={() => handleStopNightShift(s, false)}
                          disabled={stoppingId === s.id}
                          className="px-3 py-1.5 text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg hover:bg-yellow-100 disabled:opacity-50 font-medium"
                          title="完成當前輪次後停止"
                        >
                          {stoppingId === s.id ? '停止中...' : '本輪後停止'}
                        </button>
                        <button
                          onClick={() => { if (confirm('強制停止會立即終止 tmux session，當前工作可能遺失。確定？')) handleStopNightShift(s, true); }}
                          disabled={stoppingId === s.id}
                          className="px-3 py-1.5 text-xs bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-100 disabled:opacity-50 font-medium"
                          title="立即終止 tmux session"
                        >
                          強制停止
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleLaunchNightShift(s)}
                          disabled={launchingId === s.id}
                          className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 disabled:opacity-50 font-medium"
                        >
                          {launchingId === s.id ? '啟動中...' : '啟動夜班'}
                        </button>
                        <button
                          onClick={() => { setEditingSchedule(s); setShowForm(true); }}
                          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="編輯排程"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="px-2 py-1.5 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="刪除排程"
                        >
                          刪除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Launch Success Modal */}
      {launchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setLaunchResult(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-green-600 dark:text-green-400 mb-3">夜班已啟動</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              tmux session: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">{launchResult.sessionName}</code>
            </p>
            <p className="text-xs text-gray-500 mb-4">進度會自動回報到此頁面。也可以用以下指令查看即時輸出：</p>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 font-mono text-sm text-gray-800 dark:text-gray-200">
              tmux attach -t {launchResult.sessionName}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setLaunchResult(null)} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">好</button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback: Manual Command Modal */}
      {launchCommand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setLaunchCommand(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 max-w-2xl w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-3">自動啟動失敗，請手動執行</h3>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 font-mono text-sm text-gray-800 dark:text-gray-200 break-all">{launchCommand}</div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setLaunchCommand(null)} className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">關閉</button>
              <button onClick={handleCopyCommand} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {copied ? '已複製!' : '複製指令'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run History */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">執行歷史</h2>
        </div>
        {runs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">尚無執行紀錄</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {runs.map((r) => (
              <div key={r.id}>
                <div
                  className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => setExpandedRun(expandedRun === r.id ? null : r.id)}
                >
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status] || ''}`}>
                    {r.status}
                  </span>
                  {r.roundType && (
                    <span className={`px-1.5 py-0 rounded text-xs font-medium ${ROUND_TYPE_BADGES[r.roundType]?.color || ''}`}>
                      {ROUND_TYPE_BADGES[r.roundType]?.label} R{r.roundNumber}
                    </span>
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                    {r.scheduleName || r.scheduleId}
                  </span>
                  <span className="text-xs text-gray-400">{formatDuration(r.durationMs)}</span>
                  <span className="text-xs text-gray-400">{formatTime(r.startedAt)}</span>
                  <span className="text-xs text-gray-400">{(r.report || r.feedback) ? '▼' : ''}</span>
                </div>
                {expandedRun === r.id && <RunReport run={r} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
