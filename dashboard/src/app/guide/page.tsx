'use client';

import { useState } from 'react';
import Link from 'next/link';

function CollapsibleSection({ title, defaultOpen = false, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <span className="text-gray-400 text-xl transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          &#9660;
        </span>
      </button>
      {open && <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800 pt-4">{children}</div>}
    </div>
  );
}

const dashboardPages = [
  { name: '總覽', href: '/', desc: '系統全局狀態、專案進度、即將到期的截止日、最近活動一覽' },
  { name: '專案', href: '/projects', desc: '專案列表與詳情頁，追蹤每個專案的進度和參與的 Agent' },
  { name: '工具監控', href: '/agents', desc: 'Agent 工具使用統計、能力配置、使用頻率分析' },
  { name: '任務紀錄', href: '/tasks', desc: '歷史任務查詢，可按專案或 Agent 篩選' },
  { name: '記憶庫', href: '/memory', desc: '知識圖譜 3D 視覺化 + 記憶列表搜尋篩選' },
  { name: '截止日', href: '/deadlines', desc: 'Deadline 管理，追蹤即將到期的重要日期' },
];

const commands = [
  { cmd: '/kickoff', purpose: '建立新專案', scene: '開始一個全新的專案時' },
  { cmd: '/standup', purpose: '每日開工報告', scene: '每天開工，回顧進度、規劃今天' },
  { cmd: '/switch <expert>', purpose: '切換專家模式', scene: '切換工作類型（寫程式→寫論文）' },
  { cmd: '/overview', purpose: '全專案鳥瞰', scene: '快速掃一眼所有專案狀態' },
  { cmd: '/progress', purpose: '討論並更新進度', scene: '工作途中記錄進展' },
  { cmd: '/review', purpose: '每日/週回顧', scene: '一天或一週結束時歸納成果' },
  { cmd: '/done', purpose: '結束工作收尾', scene: '單次工作結束，回報進度+存知識' },
];

const experts = [
  { id: 'ai-engineer', name: 'AI 工程', desc: '模型訓練、推論優化、實驗設計' },
  { id: 'research', name: '研究方法論', desc: '文獻調研、證據綜合、方法論分析' },
  { id: 'paper', name: '論文寫作', desc: '學術論文撰寫、投稿準備' },
  { id: 'web-dev', name: '網站開發', desc: '前後端開發、API 設計' },
  { id: 'ppt', name: '簡報製作', desc: '投影片設計與生成' },
  { id: 'debug', name: '除錯', desc: '系統性診斷與修復' },
  { id: 'code-review', name: '程式碼審查', desc: '品質、安全、最佳實踐' },
  { id: 'data-analysis', name: '數據分析', desc: '資料處理、統計、視覺化' },
];

const subagents = [
  { name: 'ai-engineer', purpose: '深度學習實驗、模型訓練、推論優化', model: 'opus' },
  { name: 'debugger', purpose: '診斷 bug、分析 stack trace、ML 除錯', model: 'sonnet' },
  { name: 'research-analyst', purpose: '通用深度研究、多源資訊整合', model: 'sonnet' },
  { name: 'scientific-researcher', purpose: '論文搜尋、literature review、方法論比較', model: 'sonnet' },
  { name: 'code-reviewer', purpose: 'Code review、安全漏洞、最佳實踐', model: 'opus' },
  { name: 'python-pro', purpose: 'Python/ML 開發、FastAPI、資料處理', model: 'sonnet' },
  { name: 'refactoring-specialist', purpose: '程式碼重構、消除 code smell', model: 'sonnet' },
  { name: 'project-manager', purpose: '專案規劃、milestone 定義、週計劃', model: 'haiku' },
  { name: 'ppt-agent', purpose: '投影片製作（整合 CC 進度資料）', model: 'sonnet' },
  { name: 'progress-reviewer', purpose: '每日/週回顧、進度更新、知識提取', model: 'sonnet' },
  { name: 'web-search-agent', purpose: '深度網路搜尋', model: 'sonnet' },
];

const memoryTools = [
  { tool: 'memcp_remember', purpose: '存入新記憶' },
  { tool: 'memcp_recall', purpose: '按查詢檢索記憶' },
  { tool: 'memcp_search', purpose: '多層搜尋（BM25 + 語義）' },
  { tool: 'memcp_forget', purpose: '刪除記憶' },
  { tool: 'memcp_related', purpose: '圖譜關聯查詢' },
  { tool: 'memcp_reinforce', purpose: '調整記憶權重' },
  { tool: 'memcp_consolidate', purpose: '合併重複記憶' },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">使用指南</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Agentic Me 系統完整使用手冊</p>
      </div>

      {/* Section 1: 系統概覽 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">系統概覽</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Agentic Me 是一套以<strong>個人知識庫</strong>為核心的多 Agent 協作系統。
          每個 Agent 各司其職，所有互動產生的知識自動沉澱到記憶庫，形成一個越用越聰明的 AI 助理團隊。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
            <div className="font-medium text-blue-900 dark:text-blue-300 mb-1">專案導向</div>
            <div className="text-sm text-blue-700 dark:text-blue-400">以專案資料夾為中心，CLAUDE.md 定義 context，能力按需注入</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-100 dark:border-purple-900">
            <div className="font-medium text-purple-900 dark:text-purple-300 mb-1">知識累積</div>
            <div className="text-sm text-purple-700 dark:text-purple-400">每次對話都不浪費，知識自動沉澱到 memcp 記憶庫</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-100 dark:border-green-900">
            <div className="font-medium text-green-900 dark:text-green-300 mb-1">進度追蹤</div>
            <div className="text-sm text-green-700 dark:text-green-400">Central Command 統一管理所有專案的進度與截止日</div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 font-mono text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
          <pre>{`使用者 ──→ 專案資料夾（CLAUDE.md）
              │
              ├─ Expert Skills（/switch 切換專家知識）
              ├─ Workflow Commands（/standup /progress /done ...）
              ├─ Subagents（自主派遣：ai-engineer, debugger, ...）
              ├─ Skills（/research /ppt-gen /pdf /docx ...）
              │
              ├─ memcp 記憶系統 ──→ ~/.memcp/graph.db
              └─ Central Command ──→ Dashboard（localhost:3000）`}</pre>
        </div>
      </div>

      {/* Section 2: Dashboard 頁面導覽 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dashboard 頁面導覽</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dashboardPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-white mb-1">{page.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{page.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Section 3: 指令速查表 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">指令速查表</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">指令</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">用途</th>
                <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">使用場景</th>
              </tr>
            </thead>
            <tbody>
              {commands.map((c) => (
                <tr key={c.cmd} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2.5 pr-4">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">{c.cmd}</code>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">{c.purpose}</td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400">{c.scene}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: 專家模式 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">專家模式一覽</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          透過 <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-sm">/switch &lt;expert&gt;</code> 注入專家知識到當前對話，主 Agent 即刻變身為該領域專家。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {experts.map((e) => (
            <div key={e.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-white text-sm">{e.name}</span>
              </div>
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-gray-600 dark:text-gray-400">/switch {e.id}</code>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{e.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Subagent 派遣指南 */}
      <CollapsibleSection title="Subagent 派遣指南">
        <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="font-medium text-amber-900 dark:text-amber-300 text-sm mb-2">Expert Skill vs Subagent</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expert Skill（/switch）</div>
              <ul className="text-gray-600 dark:text-gray-400 space-y-0.5 list-disc list-inside">
                <li>互動式協作，一步步討論</li>
                <li>注入到主 Agent，共用 context</li>
                <li>適合：諮詢、討論、需要來回的工作</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Subagent（派遣）</div>
              <ul className="text-gray-600 dark:text-gray-400 space-y-0.5 list-disc list-inside">
                <li>自主執行，完成後回傳結果</li>
                <li>獨立 context，不影響主 session</li>
                <li>適合：明確任務、大型獨立工作</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Subagent</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">用途</th>
                <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Model</th>
              </tr>
            </thead>
            <tbody>
              {subagents.map((s) => (
                <tr key={s.name} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-700 dark:text-gray-300">{s.name}</code>
                  </td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{s.purpose}</td>
                  <td className="py-2">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.model === 'opus' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' :
                      s.model === 'haiku' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                      'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    }`}>
                      {s.model}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Section 6: 記憶系統 */}
      <CollapsibleSection title="記憶系統（memcp）">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          memcp 是基於 SQLite 圖譜結構的記憶系統，自動累積跨 session 的知識。資料庫位於 <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-xs">~/.memcp/graph.db</code>。
        </p>
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">工具</th>
                <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">用途</th>
              </tr>
            </thead>
            <tbody>
              {memoryTools.map((t) => (
                <tr key={t.tool} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-700 dark:text-gray-300">{t.tool}</code>
                  </td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">{t.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-2">Scope 規則</div>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
              <li><code className="bg-white dark:bg-gray-700 px-1 rounded font-mono text-xs">global</code> — 跨專案通用（個人偏好、通用技術知識）</li>
              <li><code className="bg-white dark:bg-gray-700 px-1 rounded font-mono text-xs">project</code> — 特定專案限定（架構、命名、設定）</li>
              <li className="text-xs text-gray-500 dark:text-gray-500 mt-1">判斷口訣：換專案還有用嗎？有 → global，沒有 → project</li>
            </ul>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-2">重要性等級</div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">critical</span>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">high</span>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">medium</span>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">low</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-0.5">
              <div>分類：decision / fact / preference / finding / todo / general</div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Section 7: 日常工作流程 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">日常工作流程</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="absolute -top-3 left-4 bg-white dark:bg-gray-900 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">早上開工</div>
            <code className="text-sm font-mono text-blue-600 dark:text-blue-400 block mb-2">/standup</code>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>回顧上次做到哪</li>
              <li>看各專案進度</li>
              <li>看即將到期 deadline</li>
              <li>討論今天做什麼</li>
            </ul>
          </div>
          <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="absolute -top-3 left-4 bg-white dark:bg-gray-900 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">工作中</div>
            <div className="space-y-1.5 mb-2">
              <code className="text-sm font-mono text-blue-600 dark:text-blue-400 block">/switch &lt;expert&gt;</code>
              <code className="text-sm font-mono text-blue-600 dark:text-blue-400 block">/progress</code>
            </div>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>切換專家模式</li>
              <li>派遣 subagent</li>
              <li>隨時更新進度</li>
              <li>用 skills 執行任務</li>
            </ul>
          </div>
          <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="absolute -top-3 left-4 bg-white dark:bg-gray-900 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">收工</div>
            <div className="space-y-1.5 mb-2">
              <code className="text-sm font-mono text-blue-600 dark:text-blue-400 block">/review</code>
              <code className="text-sm font-mono text-blue-600 dark:text-blue-400 block">/done</code>
            </div>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>歸納今天成果</li>
              <li>更新 Dashboard</li>
              <li>存知識到記憶庫</li>
              <li>建議明天做什麼</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
          <span className="font-mono">/standup</span>
          <span>→</span>
          <span>自然對話 + /switch + /progress</span>
          <span>→</span>
          <span className="font-mono">/review</span>
          <span>or</span>
          <span className="font-mono">/done</span>
        </div>
      </div>
    </div>
  );
}
