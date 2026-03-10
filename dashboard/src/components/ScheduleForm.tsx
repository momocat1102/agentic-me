'use client';

import { useState } from 'react';
import type { Schedule, Project, ScheduleMode, ScheduleFrequency } from '@/lib/api';

interface ScheduleFormProps {
  projects: Project[];
  initial?: Schedule | null;
  onSubmit: (input: any) => Promise<void>;
  onCancel: () => void;
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function ScheduleForm({ projects, initial, onSubmit, onCancel }: ScheduleFormProps) {
  const [name, setName] = useState(initial?.name || '');
  const [mode, setMode] = useState<ScheduleMode>(initial?.mode || 'single');
  const [projectId, setProjectId] = useState(initial?.projectId || projects[0]?.id || '');
  const [workDir, setWorkDir] = useState(initial?.workDir || '');

  // Single mode fields
  const [frequency, setFrequency] = useState<ScheduleFrequency>(initial?.frequency || 'daily');
  const [startTime, setStartTime] = useState(initial?.startTime || '02:00');
  const [dayOfWeek, setDayOfWeek] = useState(initial?.dayOfWeek ?? 1);

  // Iterative mode fields
  const [windowStart, setWindowStart] = useState(initial?.windowStart || '22:00');
  const [windowEnd, setWindowEnd] = useState(initial?.windowEnd || '06:00');
  const [intervalHours, setIntervalHours] = useState(initial?.intervalHours || 2);
  const [maxRounds, setMaxRounds] = useState(initial?.maxRounds || 8);
  const [reviewPrompt, setReviewPrompt] = useState(initial?.reviewPrompt || '');

  // Shared fields
  const [prompt, setPrompt] = useState(initial?.prompt || '');
  const [safetyRules, setSafetyRules] = useState(initial?.safetyRules || '');
  const [maxTurns, setMaxTurns] = useState(initial?.maxTurns || 50);
  const [timeoutMs, setTimeoutMs] = useState(initial?.timeoutMs || 600000);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleProjectChange = (id: string) => {
    setProjectId(id);
    setWorkDir('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'iterative') {
        await onSubmit({
          name,
          mode,
          projectId,
          workDir,
          prompt,
          reviewPrompt: reviewPrompt || undefined,
          windowStart,
          windowEnd,
          intervalHours,
          maxRounds: maxRounds || undefined,
          safetyRules: safetyRules || undefined,
          maxTurns,
          timeoutMs,
        });
      } else {
        await onSubmit({
          name,
          mode: 'single',
          projectId,
          workDir,
          frequency,
          startTime,
          dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
          prompt,
          safetyRules: safetyRules || undefined,
          maxTurns,
          timeoutMs,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">
        {initial ? '編輯排程' : '新增排程'}
      </h3>

      {/* Name + Project */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">排程名稱</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="每日推進 MACS 論文"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">專案</label>
          <select
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Toggle */}
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">模式</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === 'single'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-blue-400'
            }`}
          >
            單次執行
          </button>
          <button
            type="button"
            onClick={() => setMode('iterative')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === 'iterative'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-purple-400'
            }`}
          >
            迭代夜班
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {mode === 'single'
            ? '按設定的頻率和時間執行一次任務'
            : '在時間窗口內，每隔 N 小時自動執行 Task → Review 循環，Review 的回饋會注入下一輪 Task'
          }
        </p>
      </div>

      {/* Time Settings — depends on mode */}
      {mode === 'single' ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">頻率</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="daily">每天</option>
              <option value="weekly">每週</option>
              <option value="once">單次</option>
            </select>
          </div>
          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">星期</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                {DAY_LABELS.map((label, i) => (
                  <option key={i} value={i}>週{label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">開始時間</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800/40">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">窗口開始</label>
              <input
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">窗口結束</label>
              <input
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">每隔（小時）</label>
              <input
                type="number"
                value={intervalHours}
                onChange={(e) => setIntervalHours(parseInt(e.target.value))}
                min={1}
                max={12}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">最大輪數</label>
              <input
                type="number"
                value={maxRounds}
                onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                min={1}
                max={50}
                placeholder="不限"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              審查 Prompt（選填，留空使用預設審查模板）
            </label>
            <textarea
              value={reviewPrompt}
              onChange={(e) => setReviewPrompt(e.target.value)}
              rows={3}
              placeholder="留空將使用預設的主導型品質審查 prompt — 會自動驗證成品、操作介面、給出具體優化指令"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">工作 Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          rows={5}
          placeholder={mode === 'iterative'
            ? '請閱讀專案的 CLAUDE.md 和進度追蹤，找出下一步待做的工作，自動推進專案進度...'
            : '請閱讀專案的 CLAUDE.md 和進度追蹤，找出下一步待做的工作，自動推進專案進度...'
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono"
        />
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        {showAdvanced ? '收起進階設定' : '展開進階設定'}
      </button>

      {showAdvanced && (
        <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          {/* Work Dir */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">工作目錄</label>
            <input
              type="text"
              value={workDir}
              onChange={(e) => setWorkDir(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono"
            />
          </div>

          {/* Safety Rules */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">安全護欄（選填）</label>
            <textarea
              value={safetyRules}
              onChange={(e) => setSafetyRules(e.target.value)}
              rows={3}
              placeholder={"可以：讀取檔案、修改程式碼、執行測試\n不可以：刪除檔案、push 到 remote"}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Max Turns / Timeout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Max Turns</label>
              <input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(parseInt(e.target.value))}
                min={1}
                max={200}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Timeout（分鐘）</label>
              <input
                type="number"
                value={timeoutMs / 60000}
                onChange={(e) => setTimeoutMs(parseFloat(e.target.value) * 60000)}
                min={1}
                max={120}
                step={1}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">
          取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50 ${
            mode === 'iterative' ? 'bg-purple-600' : 'bg-blue-600'
          }`}
        >
          {submitting ? '儲存中...' : initial ? '更新' : '建立'}
        </button>
      </div>
    </form>
  );
}
