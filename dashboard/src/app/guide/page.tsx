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
  { name: '專案', href: '/projects', desc: '專案列表 + OpenSpec 變更樹 + Lifecycle Pipeline 視覺化' },
  { name: '工具監控', href: '/agents', desc: 'Agent 工具使用統計、能力配置、使用頻率分析' },
  { name: '任務紀錄', href: '/tasks', desc: '歷史任務查詢，可按專案或 Agent 篩選' },
  { name: '記憶庫', href: '/memory', desc: '知識圖譜 3D 視覺化 + 記憶列表搜尋篩選' },
  { name: '截止日', href: '/deadlines', desc: 'Deadline 管理，追蹤即將到期的重要日期' },
  { name: '排程（夜班）', href: '/schedules', desc: '夜班排程管理、Circuit Breaker 狀態監控' },
  { name: '使用指南', href: '/guide', desc: '你現在在這裡 — 系統完整使用手冊' },
];

const openspecWorkflow = [
  { step: 1, cmd: '/kickoff', label: '建專案', desc: '建立資料夾 + CLAUDE.md + 自動執行 openspec init + 註冊 Central Command', color: 'gray', icon: '⬡' },
  { step: 2, cmd: '/opsx:explore', label: '探索想法', desc: '調查需求、釐清問題、研究現有程式碼，不需承諾變更', color: 'purple', icon: '◈' },
  { step: 3, cmd: '/opsx:propose <name>', label: '提出變更', desc: '一步建立 change + 自動產出 proposal / design / tasks', color: 'purple', icon: '◇' },
  { step: 4, cmd: '/opsx:apply <name>', label: '實作變更', desc: '按 tasks.md 逐項實作，自動勾選完成項、同步 Dashboard', color: 'blue', icon: '▶' },
  { step: 5, cmd: '/opsx:archive <name>', label: '歸檔變更', desc: '歸檔 change + 合併 specs + 自動執行 openspec archive', color: 'green', icon: '✓' },
  { step: 6, cmd: '/opsx:sync', label: '同步 Dashboard', desc: '掃描所有 changes 狀態，全量同步到 Central Command', color: 'gray', icon: '⟳' },
  { step: 7, cmd: '/done', label: '收工', desc: '回報進度 + 同步 tasks.md + 存知識到記憶庫', color: 'indigo', icon: '■' },
];

const cliToolGroups = [
  {
    category: '專案設定',
    color: 'gray',
    tools: [
      { cmd: 'openspec init --tools claude', desc: '初始化 OpenSpec 結構 + 安裝 Claude Code commands/skills', flags: '--force --profile <core|custom>' },
      { cmd: 'openspec update', desc: '更新 AI tool 的 instruction 檔案到最新版', flags: '--force' },
      { cmd: 'openspec config profile', desc: '互動式選擇工作流 profile（core / custom）' },
      { cmd: 'openspec config list', desc: '顯示所有目前設定值', flags: '--json' },
      { cmd: 'openspec config set <key> <value>', desc: '修改設定值（自動型別轉換）' },
      { cmd: 'openspec config get <key>', desc: '取得特定設定值（可用於腳本）' },
      { cmd: 'openspec config reset', desc: '重置所有設定為預設值' },
      { cmd: 'openspec config edit', desc: '用 $EDITOR 開啟設定檔編輯' },
      { cmd: 'openspec config path', desc: '顯示設定檔路徑' },
    ],
  },
  {
    category: 'Change 管理',
    color: 'blue',
    tools: [
      { cmd: 'openspec new change <name>', desc: '建立新的 change 目錄（含 .openspec.yaml scaffold）' },
      { cmd: 'openspec list', desc: '列出所有活躍的 changes', flags: '--json --sort <recent|name>' },
      { cmd: 'openspec show <name>', desc: '查看特定 change 的詳細資訊', flags: '--json --type change --deltas-only' },
      { cmd: 'openspec status --change <name>', desc: '顯示 change 的 artifact 完成狀態', flags: '--json --schema <name>' },
      { cmd: 'openspec validate <name>', desc: '驗證特定 change 的格式', flags: '--strict --json' },
      { cmd: 'openspec validate --changes', desc: '驗證所有 changes' },
      { cmd: 'openspec validate --all', desc: '驗證所有 changes + specs', flags: '--strict --json --concurrency <n>' },
      { cmd: 'openspec archive <name>', desc: '歸檔已完成的 change 並更新 main specs', flags: '-y --skip-specs --no-validate' },
    ],
  },
  {
    category: 'Spec 管理',
    color: 'purple',
    tools: [
      { cmd: 'openspec list --specs', desc: '列出所有 specifications' },
      { cmd: 'openspec show <id> --type spec', desc: '查看特定 spec 內容', flags: '--json --requirements --no-scenarios' },
      { cmd: 'openspec validate --specs', desc: '驗證所有 specs 結構' },
      { cmd: 'openspec spec validate <id>', desc: '驗證特定 spec' },
    ],
  },
  {
    category: 'Artifact 與 Schema',
    color: 'amber',
    tools: [
      { cmd: 'openspec instructions <artifact> --change <name>', desc: '取得建立 artifact 的完整指引（含 context/rules/template）', flags: '--json --schema <name>' },
      { cmd: 'openspec templates', desc: '顯示所有 artifact 的 template 路徑', flags: '--json --schema <name>' },
      { cmd: 'openspec schemas', desc: '列出可用的 workflow schemas 及說明' },
      { cmd: 'openspec schema which <name>', desc: '查詢 schema 的解析來源位置' },
      { cmd: 'openspec schema validate <name>', desc: '驗證 schema 結構與 templates' },
      { cmd: 'openspec schema fork <source> [name]', desc: '複製現有 schema 到專案目錄進行客製化' },
      { cmd: 'openspec schema init <name>', desc: '建立新的 project-local schema' },
    ],
  },
  {
    category: '互動 & 工具',
    color: 'green',
    tools: [
      { cmd: 'openspec view', desc: '開啟終端互動式儀表板（TUI）' },
      { cmd: 'openspec feedback "<message>"', desc: '提交使用回饋給 OpenSpec 團隊', flags: '--body <text>' },
      { cmd: 'openspec completion install', desc: '安裝 shell 自動補全（bash/zsh/fish）' },
      { cmd: 'openspec --version', desc: '顯示 CLI 版本' },
    ],
  },
];

const lifecycleStages = [
  { status: 'draft', label: '草稿', icon: '○', color: 'gray', desc: '提案已建立，尚未開始實作' },
  { status: 'in_progress', label: '進行中', icon: '●', color: 'blue', desc: '正在實作中，tasks.md 持續更新' },
  { status: 'completed', label: '已完成', icon: '✓', color: 'green', desc: '所有任務完成，等待驗證或歸檔' },
  { status: 'archived', label: '已歸檔', icon: '◌', color: 'gray', desc: '洞察已合併到 specs/，變更已封存' },
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

      {/* Section: OpenSpec 專案追蹤系統 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">OpenSpec 專案追蹤系統</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">核心工作流</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">CLI v1.2.0</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          基於 <a href="https://github.com/Fission-AI/OpenSpec" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Fission-AI/OpenSpec</a> 官方 CLI 的 spec-driven development 工作流。
          所有需求和變更以<strong>純 Markdown 檔案</strong>為 source of truth，
          Dashboard 透過 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded font-mono text-xs">openspec list --json</code> 取得資料進行可視化。
        </p>

        {/* Lifecycle Pipeline 視覺化 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Change Lifecycle</h3>
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
            {lifecycleStages.map((stage, i) => (
              <div key={stage.status} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center text-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-2 border-2
                    ${stage.color === 'blue'
                      ? 'border-blue-400 bg-blue-500/20 text-blue-400'
                      : stage.color === 'green'
                        ? 'border-green-400 bg-green-500/20 text-green-400'
                        : 'border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }
                  `}>
                    {stage.icon}
                  </div>
                  <div className={`text-xs font-semibold mb-0.5 ${
                    stage.color === 'blue' ? 'text-blue-500' : stage.color === 'green' ? 'text-green-500' : 'text-gray-500'
                  }`}>
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[120px]">{stage.desc}</div>
                </div>
                {i < lifecycleStages.length - 1 && (
                  <div className="flex-1 h-0.5 mx-3 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-gray-400 text-xs">&rarr;</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 完整專案模擬教學 ── */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">完整專案模擬：Todo App</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            假設你要開發一個 Todo App，以下模擬從建專案到歸檔的完整過程。
          </p>

          <div className="space-y-0">
            {/* Stage 1: 建立專案 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600">1</div>
                <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mt-1" />
              </div>
              <div className="pb-5 flex-1">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">建立專案 + 初始化追蹤</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400">/kickoff</code>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  一個指令搞定一切：建立專案資料夾 + CLAUDE.md + 自動執行 <code className="font-mono">openspec init</code> + 註冊到 Central Command。
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 overflow-x-auto">
                  <pre>{`todo-app/
├── CLAUDE.md
├── .claude/
│   ├── commands/opsx/      ← 官方 /opsx:* 指令
│   └── skills/             ← OpenSpec skills
└── openspec/
    ├── specs/              ← 專案規格（source of truth）
    ├── changes/            ← 進行中的變更
    └── changes/archive/    ← 已歸檔的變更`}</pre>
                </div>
              </div>
            </div>

            {/* Stage 2: 規劃第一個需求 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 border-2 border-purple-300 dark:border-purple-700">2</div>
                <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mt-1" />
              </div>
              <div className="pb-5 flex-1">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">規劃第一個需求</div>
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400 block w-fit mb-2">/opsx:propose add-auth</code>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Claude 會和你討論動機和範圍，然後一步產出 proposal.md + design.md + tasks.md。使用 <code className="font-mono">openspec status --change add-auth --json</code> 查看 artifact 完成狀態。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">proposal.md</div>
                    <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      <pre>{`## Why
使用者需要登入才能管理
個人的 Todo 項目

## What
- JWT 認證
- 登入/註冊 API
- 前端登入頁面`}</pre>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">tasks.md</div>
                    <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      <pre>{`- [ ] 設計 User schema
- [ ] 實作 JWT middleware
- [ ] 建立 /auth/login API
- [ ] 建立 /auth/register API
- [ ] 前端登入頁面
- [ ] 整合測試`}</pre>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-400 bg-gray-200 dark:bg-gray-700" />
                  <span>Dashboard 樹狀圖出現灰色 <strong>draft</strong> 節點</span>
                </div>
              </div>
            </div>

            {/* Stage 3: 同時規劃未來需求 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 border-2 border-purple-300 dark:border-purple-700">3</div>
                <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mt-1" />
              </div>
              <div className="pb-5 flex-1">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">同時規劃其他需求</div>
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400 block w-fit mb-2">/opsx:propose add-dark-mode</code>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  可以先規劃多個 change 而不用馬上實作。Dashboard 會顯示多個 draft 節點，形成完整的規劃時間軸。
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Dashboard 預覽</div>
                  <div className="space-y-2 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-400 bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-gray-400 font-mono">add-auth</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">draft</span>
                      <span className="text-[10px] text-gray-500 font-mono">0/6</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-400 bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-gray-400 font-mono">add-dark-mode</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">draft</span>
                      <span className="text-[10px] text-gray-500 font-mono">0/4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage 4: 開始實作 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700">4</div>
                <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mt-1" />
              </div>
              <div className="pb-5 flex-1">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">開始實作</div>
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400 block w-fit mb-2">/opsx:apply add-auth</code>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Claude 讀取 tasks.md + design.md，逐項實作程式碼。每完成一項自動把 <code className="font-mono">- [ ]</code> 改成 <code className="font-mono">- [x]</code>，同步 Dashboard。
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">實作中的 tasks.md</div>
                  <div className="font-mono text-[11px] space-y-1">
                    <div className="text-green-500">- [x] 設計 User schema</div>
                    <div className="text-green-500">- [x] 實作 JWT middleware</div>
                    <div className="text-green-500">- [x] 建立 /auth/login API</div>
                    <div className="text-blue-400">- [ ] 建立 /auth/register API  &larr; 正在做</div>
                    <div className="text-gray-500">- [ ] 前端登入頁面</div>
                    <div className="text-gray-500">- [ ] 整合測試</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="inline-block w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  <span>Dashboard 藍色脈動 <strong>in_progress</strong>，進度分數 <strong>3/6</strong> 即時更新</span>
                </div>
              </div>
            </div>

            {/* Stage 5: 驗證與完成 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-900/50 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-700">5</div>
                <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mt-1" />
              </div>
              <div className="pb-5 flex-1">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">驗證與歸檔</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-green-600 dark:text-green-400">openspec validate --all</code>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400">/opsx:archive add-auth</code>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  用 <code className="font-mono">openspec validate</code> 或 Dashboard 的 <strong>Validate</strong> 按鈕 檢查 specs 格式正確性。
                  通過後 <code className="font-mono">/opsx:archive</code> 歸檔完成的 change。也可以在 Dashboard 直接點擊「◌ 歸檔」按鈕操作。
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 overflow-x-auto">
                  <pre>{`openspec/
├── specs/
│   ├── overview.md
│   └── auth.md           ← 從 add-auth 合併的認證規格
├── changes/
│   └── add-dark-mode/    ← 還在規劃中
└── archive/
    └── add-auth/         ← 已歸檔，完整保留歷史`}</pre>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                  <span>Dashboard 先變綠色 <strong>completed</strong>，歸檔後移入「歷史紀錄」區域</span>
                </div>
              </div>
            </div>

            {/* Stage 6: 版本追蹤 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-green-200 dark:bg-green-900/50 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-300 border-2 border-green-300 dark:border-green-700">6</div>
                <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mt-1" />
              </div>
              <div className="pb-5 flex-1">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">版本追蹤 — 完整時間軸</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  歸檔後的 change 不會消失。Dashboard 用統一時間軸顯示：上方是進行中的 changes，中間有分隔線，下方是「歷史紀錄」。展開即可回顧每個 task 的完成狀態。
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Dashboard 時間軸</div>
                  <div className="space-y-2 pl-2">
                    {/* Active */}
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-400 bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-gray-300 font-mono">add-dark-mode</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">draft</span>
                    </div>
                    {/* Separator */}
                    <div className="flex items-center gap-2 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                      <div className="flex-1 h-px bg-gray-600" />
                      <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">歷史紀錄</span>
                      <div className="flex-1 h-px bg-gray-600" />
                    </div>
                    {/* Archived */}
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-500 bg-gray-600/30" />
                      <span className="text-xs text-gray-500 font-mono">add-auth</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-500">archived</span>
                      <span className="text-[10px] text-gray-500 font-mono">6/6</span>
                      <span className="text-[10px] text-gray-600">&#9654; 可展開查看任務</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage 7: 日常收尾 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-indigo-200 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 border-2 border-indigo-300 dark:border-indigo-700">7</div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">日常收尾</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400">/done</code>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400">/opsx:sync</code>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <code className="font-mono">/done</code> 自動同步 tasks.md 進度 + 存知識到記憶庫。
                  <code className="font-mono">/opsx:sync</code> 手動將所有 changes 全量同步到 Dashboard。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 完整工作流（全部在 Claude Code 內完成） */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">完整工作流</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800 font-medium">全部在 Claude Code 內完成</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
            所有操作都是 slash command，Claude 會自動執行底層的 <code className="font-mono">openspec</code> CLI 指令，你不需要離開 Claude Code。
          </p>
          <div className="space-y-0">
            {openspecWorkflow.map((item, i) => {
              const stepColorMap: Record<string, { dot: string; text: string; bg: string }> = {
                gray:   { dot: 'border-gray-400 bg-gray-200 dark:bg-gray-700 text-gray-500', text: 'text-gray-500', bg: '' },
                purple: { dot: 'border-purple-400 bg-purple-500/20 text-purple-400', text: 'text-purple-400', bg: '' },
                blue:   { dot: 'border-blue-400 bg-blue-500/20 text-blue-400', text: 'text-blue-400', bg: '' },
                green:  { dot: 'border-green-400 bg-green-500/20 text-green-400', text: 'text-green-400', bg: '' },
                indigo: { dot: 'border-indigo-400 bg-indigo-500/20 text-indigo-400', text: 'text-indigo-400', bg: '' },
              };
              const sc = stepColorMap[item.color] || stepColorMap.gray;
              const isLast = i === openspecWorkflow.length - 1;
              return (
                <div key={item.step} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${sc.dot}`}>
                      {item.step}
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mt-1" />}
                  </div>
                  <div className={`${isLast ? '' : 'pb-4'} flex-1`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-semibold ${sc.text}`}>{item.label}</span>
                    </div>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">{item.cmd}</code>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center flex-wrap gap-1.5 justify-center text-xs text-gray-400 font-mono">
              <span className="text-gray-300">/kickoff</span>
              <span>&rarr;</span>
              <span className="text-purple-400">/opsx:explore</span>
              <span>&rarr;</span>
              <span className="text-purple-400">/opsx:propose</span>
              <span>&rarr;</span>
              <span className="text-blue-400">/opsx:apply</span>
              <span>&rarr;</span>
              <span className="text-green-400">/opsx:archive</span>
              <span>&rarr;</span>
              <span className="text-gray-300">/opsx:sync</span>
              <span>&rarr;</span>
              <span className="text-indigo-400">/done</span>
            </div>
            <p className="text-center text-[10px] text-gray-500 mt-1.5">步驟 2-5 可重複循環，每個 change 獨立走完整流程</p>
          </div>
        </div>

        {/* CLI 完整指令參考（進階） */}
        <CollapsibleSection title="CLI 完整指令參考（進階）">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
            以下是 <code className="font-mono bg-gray-800 px-1 rounded text-gray-400">openspec</code> CLI 的完整指令。
            正常使用時 Claude Code 會自動呼叫這些指令，但你也可以在終端手動執行。
          </p>
          <div className="space-y-4">
            {cliToolGroups.map((group) => {
              const colorMap: Record<string, { header: string; code: string }> = {
                gray:   { header: 'text-gray-400', code: 'bg-gray-800 text-gray-300 border-gray-700' },
                blue:   { header: 'text-blue-400', code: 'bg-blue-950/30 text-blue-300 border-blue-800/50' },
                purple: { header: 'text-purple-400', code: 'bg-purple-950/30 text-purple-300 border-purple-800/50' },
                amber:  { header: 'text-amber-400', code: 'bg-amber-950/30 text-amber-300 border-amber-800/50' },
                green:  { header: 'text-green-400', code: 'bg-green-950/30 text-green-300 border-green-800/50' },
              };
              const colors = colorMap[group.color] || colorMap.gray;
              return (
                <div key={group.category}>
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${colors.header}`}>
                    {group.category}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {group.tools.map((tool) => (
                          <tr key={tool.cmd} className="border-b border-gray-100 dark:border-gray-800/50">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              <code className={`text-xs px-2 py-0.5 rounded font-mono border ${colors.code}`}>{tool.cmd}</code>
                            </td>
                            <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 text-xs">{tool.desc}</td>
                            <td className="py-2 text-right">
                              {tool.flags && (
                                <span className="text-[10px] text-gray-500 font-mono">{tool.flags}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-3">
            大部分指令支援 <code className="font-mono bg-gray-800 px-1 rounded text-gray-400">--json</code> 輸出供程式化使用。
            Dashboard 的 Validate 按鈕會呼叫 <code className="font-mono bg-gray-800 px-1 rounded text-gray-400">openspec validate --all --json</code>。
          </p>
        </CollapsibleSection>

        {/* 加入現有專案 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">把做到一半的專案加入 OpenSpec</h3>
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-300 mb-3">
              OpenSpec 專為<strong>既有專案（brownfield）</strong>設計，不需要補齊歷史 specs。只需為<strong>接下來要做的工作</strong>建立 changes。
            </p>
            <div className="space-y-2 text-sm text-green-700 dark:text-green-400">
              <div className="flex gap-2 items-start">
                <span className="font-mono text-xs bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">1</span>
                <span>在專案目錄執行 <code className="font-mono bg-green-100 dark:bg-green-900/50 px-1 rounded">openspec init --tools claude</code></span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="font-mono text-xs bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">2</span>
                <span>用 <code className="font-mono bg-green-100 dark:bg-green-900/50 px-1 rounded">/opsx:explore</code> 調查現有程式碼，不需承諾任何變更</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="font-mono text-xs bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">3</span>
                <span>用 <code className="font-mono bg-green-100 dark:bg-green-900/50 px-1 rounded">/opsx:propose &lt;name&gt;</code> 為剩餘工作建立 change proposal</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="font-mono text-xs bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">4</span>
                <span>用 <code className="font-mono bg-green-100 dark:bg-green-900/50 px-1 rounded">/opsx:sync</code> 同步到 Dashboard 追蹤進度</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard 功能 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Dashboard 功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-2">資料來源指示</div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-green-900/40 text-green-400 border border-green-700/30">CLI</span>
                <span className="text-xs text-gray-500">= 透過 OpenSpec CLI 取得資料</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-gray-800 text-gray-500 border border-gray-700/30">FS</span>
                <span className="text-xs text-gray-500">= 直接讀取檔案系統（CLI 不可用時 fallback）</span>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-2">操作按鈕</div>
              <ul className="text-xs text-gray-500 space-y-1.5">
                <li><strong className="text-gray-300">Validate</strong> — 呼叫 <code className="font-mono">openspec validate</code> 檢查格式</li>
                <li><strong className="text-gray-300">▶ 開始</strong> — 將 change 從 draft 推進到 in_progress</li>
                <li><strong className="text-gray-300">✓ 完成</strong> — 標記 change 為 completed</li>
                <li><strong className="text-gray-300">◌ 歸檔</strong> — 移入 archive/，更新 Dashboard</li>
                <li><strong className="text-gray-300">⟳</strong> — 同步 tasks.md 到 Central Command DB</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 目錄結構 */}
        <CollapsibleSection title="目錄結構參考">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 font-mono text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
            <pre>{`your-project/
└── openspec/
    ├── specs/                    ← 專案規格（source of truth）
    │   ├── overview.md           ← 專案總覽與需求
    │   └── *.md                  ← 各模組規格（歸檔時合併進來）
    │
    ├── changes/                  ← 進行中的變更
    │   └── <change-name>/
    │       ├── proposal.md       ← 動機 + 狀態（draft/in_progress/completed）
    │       ├── design.md         ← 技術設計文件
    │       ├── specs/*.md        ← 變更涉及的規格修改
    │       └── tasks.md          ← 任務清單（- [ ] / - [x]）
    │
    └── archive/                  ← 已歸檔的變更（完成後移入此處）
        └── <change-name>/`}</pre>
          </div>
        </CollapsibleSection>

        {/* Dashboard 可視化 + 核心原則 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="font-medium text-blue-900 dark:text-blue-300 text-sm mb-2">Dashboard 可視化</div>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li><strong>Lifecycle Pipeline</strong> — 4 階段進度管線</li>
              <li><strong>任務子樹</strong> — 展開看每項 task 狀態</li>
              <li><strong>狀態操作</strong> — 直接推進狀態</li>
              <li><strong>統一時間軸</strong> — 歷史 + 現在一覽</li>
            </ul>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              到<Link href="/projects" className="underline font-medium"> 專案頁面 </Link>查看實際效果
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="font-medium text-amber-900 dark:text-amber-300 text-sm mb-2">核心原則</div>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
              <li><strong>Markdown = Source of Truth</strong></li>
              <li><strong>Dashboard = 可視化層</strong>（透過 CLI JSON 取資料）</li>
              <li><strong>/opsx:sync 單向同步</strong>（openspec &rarr; Dashboard）</li>
              <li><strong>每個 change 獨立封裝</strong></li>
              <li><strong>Specs 按需累積</strong>（不需補歷史）</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 4: Subagent 派遣指南 */}
      <CollapsibleSection title="Subagent 派遣指南">
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

      {/* Section 7: 兩層循環架構 + 日常工作流程 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">兩層循環架構</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Session Commands 管理「什麼時候做」，OpenSpec Commands 管理「做什麼改動」。兩者透過 3 個接合點協作。</p>

        <div className="space-y-4">
          {/* 一次性：Kickoff */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">一次性</div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/kickoff</code>
                <span className="text-gray-400 dark:text-gray-500">→</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">建專案資料夾 + CLAUDE.md + openspec init + 註冊 CC</span>
              </div>
              <div className="flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs py-1">
                <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded px-3 py-1">打開專案資料夾</div>
              </div>
            </div>
          </div>

          {/* 每日循環 */}
          <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-950/30 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">每日循環（外層：Session）</div>
            <div className="p-4 space-y-4">
              {/* standup → done */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <code className="text-sm font-mono text-blue-600 dark:text-blue-400 block mb-2">/standup</code>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li>全域概覽</li>
                    <li>active changes</li>
                    <li>選方向</li>
                    <li>行動建議</li>
                  </ul>
                </div>
                <div className="hidden md:flex items-center text-gray-400 text-2xl pt-4">→</div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <code className="text-sm font-mono text-blue-600 dark:text-blue-400 block mb-2">/done</code>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li>摘要工作</li>
                    <li>sync tasks</li>
                    <li>task log</li>
                    <li>更新進度</li>
                    <li>知識提取</li>
                  </ul>
                </div>
              </div>

              {/* 工作階段（內層） */}
              <div className="border-2 border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
                <div className="bg-purple-50 dark:bg-purple-950/30 px-4 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">工作階段（內層：Change 循環）</div>
                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">有計畫的改動：</div>
                    <div className="flex items-center flex-wrap gap-1.5 text-xs font-mono">
                      <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">explore</span>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">propose</span>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">apply</span>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300">archive</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">快速任務：</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">直接跟 Claude 對話（不需要 change）</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">隨時：</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400"><code className="font-mono text-blue-500">/progress</code> 查看更新 milestones</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 接合點 */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">3 個接合點</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-amber-700 dark:text-amber-400">
              <div><code className="font-mono text-amber-600 dark:text-amber-300">/standup</code> 顯示 active changes 狀態</div>
              <div><code className="font-mono text-amber-600 dark:text-amber-300">/done</code> 同步 OpenSpec tasks 到 CC</div>
              <div><code className="font-mono text-amber-600 dark:text-amber-300">/kickoff</code> 自動執行 openspec init</div>
            </div>
          </div>

          {/* Command 速查表 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">我想...</th>
                  <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">用什麼</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 dark:text-gray-300">
                <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">開始新專案</td><td className="py-1.5"><code className="font-mono text-blue-500 text-xs">/kickoff</code></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">早上開工，看該做什麼</td><td className="py-1.5"><code className="font-mono text-blue-500 text-xs">/standup</code></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">討論並更新進度</td><td className="py-1.5"><code className="font-mono text-blue-500 text-xs">/progress</code></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">結束這段工作</td><td className="py-1.5"><code className="font-mono text-blue-500 text-xs">/done</code></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">探索想法、調查問題</td><td className="py-1.5"><code className="font-mono text-purple-500 text-xs">/opsx:explore</code></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">開始做一個新功能</td><td className="py-1.5"><code className="font-mono text-purple-500 text-xs">/opsx:propose &lt;name&gt;</code></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">繼續實作 change</td><td className="py-1.5"><code className="font-mono text-blue-500 text-xs">/opsx:apply &lt;name&gt;</code></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">change 做完了</td><td className="py-1.5"><code className="font-mono text-green-500 text-xs">/opsx:archive &lt;name&gt;</code></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">修個小 bug、查資料</td><td className="py-1.5 text-gray-500 text-xs">直接跟 Claude 對話</td></tr>
                <tr><td className="py-1.5 pr-4">週回顧、深度分析</td><td className="py-1.5 text-gray-500 text-xs">progress-reviewer subagent</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
