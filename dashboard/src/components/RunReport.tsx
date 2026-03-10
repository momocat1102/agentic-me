'use client';

import type { ScheduleRun } from '@/lib/api';

interface RunReportProps {
  run: ScheduleRun;
}

export default function RunReport({ run }: RunReportProps) {
  return (
    <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
      {/* Round info */}
      {run.roundType && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span className={`px-2 py-0.5 rounded font-medium ${
            run.roundType === 'review'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
          }`}>
            {run.roundType === 'review' ? 'Review' : 'Task'} Round {run.roundNumber}
          </span>
        </div>
      )}

      {/* Report */}
      {run.report ? (
        <div className="mt-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">報告摘要</h4>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
            {run.report}
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm text-gray-400">無報告摘要</div>
      )}

      {/* Review Feedback */}
      {run.feedback && run.feedback !== run.report && (
        <div className="mt-3">
          <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">審查回饋</h4>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
            {run.feedback}
          </div>
        </div>
      )}

      {/* Error */}
      {run.error && (
        <div className="mt-3">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">錯誤訊息</h4>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono">
            {run.error}
          </div>
        </div>
      )}

      {/* Full output */}
      {run.output && (
        <details className="mt-3">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            完整輸出（{run.output.length.toLocaleString()} 字元）
          </summary>
          <div className="mt-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
            {run.output}
          </div>
        </details>
      )}

      {/* Metadata */}
      <div className="mt-3 flex gap-4 text-xs text-gray-400">
        <span>ID: {run.id.slice(0, 8)}</span>
        {run.exitCode !== undefined && <span>Exit code: {run.exitCode}</span>}
        {run.startedAt && <span>開始: {new Date(run.startedAt).toLocaleString('zh-TW')}</span>}
        {run.completedAt && <span>完成: {new Date(run.completedAt).toLocaleString('zh-TW')}</span>}
      </div>
    </div>
  );
}
