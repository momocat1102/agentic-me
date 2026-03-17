# Agentic Me — 個人 AI Agent 協作系統

> 作者：chunyen｜最後更新：2026-03-10（Agent 行為約束升級：Circuit Breaker + Honesty Protocol）

---

## 一、系統願景

建立一套以**個人知識庫**為核心的多 Agent 協作系統。每個 Agent 各司其職處理不同專案與事務，所有互動過程中產生的知識自動沉澱到記憶庫，最終形成一個真正理解你、越用越聰明的**個人 AI 助理團隊**。

核心理念：**你的每一次對話都不浪費，每一段思考都變成資產。**

---

## 二、系統架構

```
┌─────────────────────────────────────────────────────────────────────┐
│                          使用者 (chunyen)                            │
│                               │                                      │
│                    在專案資料夾中開啟 Claude Code                      │
│                               ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              專案資料夾 (Claude Code session)                   │  │
│  │  macs-paper/ / thesis/ / annotation-platform/ / ...           │  │
│  │                                                               │  │
│  │  CLAUDE.md（專案 context + 檔案規範 + 進度追蹤）                │  │
│  │                                                               │  │
│  │  工具層（全域共用）：                                           │  │
│  │  ├─ Workflow Commands（/standup /progress /done /kickoff）      │  │
│  │  ├─ Subagents（自主派遣：ai-engineer, debugger, ...）          │  │
│  │  ├─ Existing Skills（/research /ppt-gen /pdf /docx ...）       │  │
│  │  ├─ memcp（記憶系統）← MCP Server                             │  │
│  │  └─ central-command（進度追蹤）← MCP Server                    │  │
│  └──────────────┬──────────────────────┬────────────────────────┘  │
│                 │                      │                            │
│          memcp_remember          update_progress                    │
│          memcp_recall            report_task_completion             │
│                 │                manage_deadline                    │
│                 ▼                      ▼                            │
│  ┌───────────────────┐  ┌──────────────────────────────┐          │
│  │   memcp 記憶庫     │  │  Central Command Server      │          │
│  │  ~/.memcp/         │  │  localhost:4000 (HTTP)        │          │
│  │  graph.db          │  │  localhost:4001 (WebSocket)   │          │
│  │  (SQLite 圖譜)     │  │  central-command.db (SQLite)  │          │
│  └───────────────────┘  └───────────────┬───────────────┘          │
│                                         │                          │
│                                         ▼                          │
│                            ┌─────────────────────────┐             │
│                            │   Dashboard (Next.js)    │             │
│                            │   localhost:3000          │             │
│                            │   即時顯示所有狀態        │             │
│                            └─────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、專案導向工作系統

### 3.1 核心概念

以**專案資料夾**為中心，而非以 Agent 資料夾為中心。每個專案有自己的 CLAUDE.md，定義專案 context 和檔案規範。專業能力透過 **Subagents** 和 **Skills** 按需使用。

```
專案資料夾（工作空間）
├── CLAUDE.md              ← 專案 context（唯一必建）
└── （子目錄按需建立）
    ├── workbase/          ← 程式碼
    ├── paper/             ← 論文
    ├── ppt/               ← 投影片
    ├── data/              ← 資料
    ├── docs/              ← 筆記、文獻
    └── outputs/           ← 最終產出
```

### 3.2 專案清單

| 專案 ID | 名稱 | 路徑 |
|---------|------|------|
| `macs-paper` | MACS 會議論文 | `/mnt/d/WorkSpace/macs-paper/` |
| `thesis` | 碩士畢業論文 | `/mnt/d/WorkSpace/thesis/` |
| `annotation-platform` | 醫生標注平台 | `/mnt/d/WorkSpace/annotation-platform/` |
| `weekly-meeting` | 每週教授 Meeting | （在對應專案內處理） |
| `foxconn-report` | 鴻海實習報告 | （在對應專案內處理） |
| `system-agent` | Agentic Me 系統 | `/mnt/d/WorkSpace/system-agent/` |

新專案透過 `/kickoff` 建立，自動生成資料夾 + CLAUDE.md + 註冊到 CC。

### 3.3 Subagents（自主派遣）

Subagent 定義在 `~/.claude/agents/`，用於大型自主任務的獨立派遣。

| Subagent | 用途 | Model |
|----------|------|-------|
| ai-engineer | 深度學習實驗、模型訓練、推論優化 | opus |
| debugger | 診斷 bug、分析 stack trace、ML 除錯 | sonnet |
| research-analyst | 通用深度研究、多源資訊整合 | sonnet |
| scientific-researcher | 論文搜尋、literature review、方法論比較 | sonnet |
| code-reviewer | Code review、安全漏洞、最佳實踐 | opus |
| python-pro | Python/ML 開發、FastAPI、資料處理 | sonnet |
| refactoring-specialist | 程式碼重構、消除 code smell | sonnet |
| project-manager | 專案規劃、milestone 定義、週計劃 | haiku |
| ppt-agent | 投影片製作（整合 CC 進度資料） | sonnet |
| progress-reviewer | 每日/週回顧、進度更新、知識提取 | sonnet |
| web-search-agent | 深度網路搜尋 | sonnet |

### 3.4 已安裝的 Skills（功能型）

| Skill | 用途 |
|-------|------|
| `/research` | 研究大綱生成 |
| `/research-deep` | 深度調研（每個項目獨立 agent） |
| `/ppt-gen` | PPTX 生成（PptxGenJS） |
| `/ppt-gen-aiia` | PPTX 生成（AIIA 模板） |
| `/slide-planner` | 投影片結構規劃 |
| `/pdf` | PDF 處理 |
| `/docx` | Word 文件處理 |
| `/notebooklm` | NotebookLM 查詢 |
| `/skill-creator` | 建立/改善 skill |

---

## 四、記憶系統 (memcp)

memcp 是 Claude Code 的持久化記憶系統，透過知識圖譜儲存跨 session 的決策、偏好和發現。

**獨立安裝：** memcp 現在有自己的安裝工具，請見 [memcp-pro](https://github.com/momocat1102/memcp-pro)。

安裝後包含：
- **memcp MCP Server** — 圖譜式記憶存取（`~/.memcp/graph.db`）
- **Hooks** — 自動載入記憶、壓縮前提醒、漸進式存檔提醒
- **Skills** — `/memcp-save`、`/memcp-search`、`/memcp-session-start`
- **記憶管理協議** — 智慧去重、scope 選擇、知識提取流程

越用越聰明 — 隨著記憶累積，Claude 會更了解你的工作習慣、技術偏好和專案脈絡。

---

## 五、Central Command（進度追蹤中心）

### 5.1 Server

| 項目 | 值 |
|------|-----|
| 位置 | `/mnt/d/WorkSpace/system-agent/` (monorepo: server + dashboard) |
| 框架 | Hono 4.7.4 + TypeScript |
| HTTP | `localhost:4000` |
| WebSocket | `localhost:4001` |
| 資料庫 | `server/data/central-command.db` (SQLite) |
| 啟動方式 | `cd system-agent && npm run dev:server` |

Central Command 是獨立的常駐服務，需手動啟動。Server 沒跑時，Agent 照常工作，只是進度不會被記錄。

### 5.2 MCP Server（給 Agent 呼叫）

全域註冊在 `~/.claude/mcp.json`，所有 Agent 共用。

| 工具 | 用途 |
|------|------|
| `list_agents` | 列出所有 Agent 狀態 |
| `list_projects` | 列出所有專案及狀態 |
| `get_task_history` | 查詢任務歷史紀錄（可按 Agent / 專案篩選） |
| `report_task_completion` | 回報完成的任務（可指定所屬專案） |
| `update_progress` | 更新專案進度百分比 |
| `manage_deadline` | 新增/更新/完成截止日 |

### 5.3 Dashboard

| 項目 | 值 |
|------|-----|
| 框架 | Next.js 16.1.6 + React 19.2.3 + Tailwind CSS 4 |
| 網址 | `localhost:3000` |
| 啟動方式 | `cd system-agent && npm run dev:dashboard` |

| 頁面 | 路徑 | 功能 |
|------|------|------|
| 總覽 | `/` | Stats + Agent 卡片 + 專案進度 + 截止日 + 最近活動 |
| 專案 | `/projects` | 專案卡片（進度 + 任務數 + 參與 Agent），點擊進入詳情 |
| 專案詳情 | `/projects/:id` | 進度追蹤 + 參與 Agent + 近期任務 + 截止日 |
| Agent 管理 | `/agents` | 檢視每個 Agent 的 Skills / Commands / MCP Tools 能力配置 |
| 任務紀錄 | `/tasks` | 歷史任務表格，可按 Agent 和專案篩選 |
| 記憶庫 | `/memory` | 知識圖譜視覺化（3D Force Graph）+ 記憶列表搜尋篩選 |
| 截止日 | `/deadlines` | CRUD 管理截止日 |

### 5.4 資料表 (SQLite)

| 表 | 用途 |
|----|------|
| `agents` | Agent 基本資訊與狀態 |
| `projects` | 專案定義（跨 Agent 追蹤單位） |
| `tasks` | 任務歷史紀錄（含 project_id 關聯） |
| `events` | Agent 事件流 |
| `progress` | 專案進度（支援父子關係） |
| `deadlines` | 截止日管理 |
| `schedules` | 夜班排程（含 circuit breaker 欄位） |
| `schedule_runs` | 排程執行歷史 |

---

## 六、自動化機制

### 6.1 Hooks

所有 Hook 定義在 `~/.claude/settings.json`，全域生效。

| Hook | 檔案 | 觸發時機 | 功能 |
|------|------|---------|------|
| SessionStart | `memcp-session-start.sh` | 開啟任何 Agent 新 session | 從 graph.db 撈 15 條記憶 + 從 CC 撈最近 5 筆跨 Agent 活動注入對話 |
| PreCompact | `memcp-pre-compact.sh` | context 要壓縮前 | 提醒 Agent 先提取知識存入 memcp |
| Stop | `memcp-stop.sh` | 每次 Agent 回覆完 | 累積 ≥10 輪 + context ≥55% 提醒存記憶 |
| Stop | `cc-progress-stop.sh` | 每次 Agent 回覆完 | CC server 在跑 + ≥3 輪，提醒回報進度 |
| PostToolUse | `memcp-reset-counter.sh` | 呼叫 memcp_remember 後 | 重置輪次計數器 |

### 6.2 自訂 Commands

全域 commands 在 `~/.claude/commands/`，所有專案 session 可用。

**Session Commands**（全域 `~/.claude/commands/`）— 管理「什麼時候做」：

| Command | 觸發時機 | 職責 |
|---------|---------|------|
| `/kickoff` | 一次性 | 建專案（資料夾 + CLAUDE.md + openspec init + 註冊 CC） |
| `/standup` | 每個 session 開始 | 回顧全域進度 + active changes + 規劃方向 |
| `/progress` | 工作中隨時 | 查看/更新 Central Command milestones |
| `/done` | 每個 session 結束 | 摘要 + sync OpenSpec tasks + task log + 知識提取 |

**OpenSpec Commands**（專案級 `.claude/commands/opsx/`，由 `openspec init` 產生）— 管理「做什麼改動」：

| Command | 觸發時機 | 職責 |
|---------|---------|------|
| `/opsx:explore` | 有想法想釐清時 | 思考、調查、不寫程式 |
| `/opsx:propose <name>` | 決定要做時 | 建立 change + artifacts |
| `/opsx:apply <name>` | 開始/繼續實作時 | 逐步完成 tasks |
| `/opsx:archive <name>` | change 全部完成時 | 歸檔、合併 specs |

### 6.3 資料流向

**Agent 完成工作時：**

```
Agent 完成任務
    │
    ├─ Stop Hook 觸發
    │   ├─ cc-progress-stop.sh → 提醒回報進度
    │   └─ memcp-stop.sh → 提醒存記憶
    │
    ├─ Agent 呼叫 memcp_remember → ~/.memcp/graph.db
    │
    ├─ Agent 呼叫 report_task_completion → CC Server → central-command.db
    │
    ├─ Agent 呼叫 update_progress → CC Server → central-command.db
    │                                                    │
    └─ CC Server 透過 WebSocket 推送 → Dashboard 即時更新
```

**Agent 開始新 Session 時：**

```
Agent 啟動
    │
    ├─ SessionStart Hook → memcp-session-start.sh
    │   ├─ 從 graph.db 撈 15 條記憶注入對話
    │   └─ 從 CC 撈最近 5 筆跨 Agent 活動（如果 server 在線）
    │
    └─ Agent 讀取 workspace 的 CLAUDE.md
```

---

## 6.5 Agent 行為約束（源自 fire-flow 設計模式）

以下行為約束定義在 agents / commands 的 .md 文件中，由 Claude 自主遵循。

### Circuit Breaker Protocol

當 Agent 卡住時，按 stuck 類型分類後採取對應行動：

| Type | Signal | Action |
|------|--------|--------|
| TRANSIENT | 暫時失敗（flaky test） | 重試最多 2 次 |
| FIXATION | 同方法重複 3+ 次 | 強制換方法 |
| SEMANTIC | 語法對但語意錯 | 重讀需求 |
| DEAD_END | 所有方法耗盡 | 標記跳過，回報 |
| STALL | 停滯 3+ 輪 | Context rotation |
| DRIFT | 偏離目標 | 重新錨定到 CLAUDE.md |

**定義位置**：`~/.claude/agents/debugger.md`

**Server-side 實作**：`report-round` API 追蹤 `consecutive_failures`，連續 3 次 failed 自動 disable 排程。Dashboard 顯示失敗計數和 Circuit Breaker 觸發狀態。

### Honesty Protocol

- 信心 < 50% 必須先 research 再執行
- 不確定的部分用 `[UNCERTAIN]` 標記
- 禁止用模糊語言回報完成

**定義位置**：`~/.claude/CLAUDE.md`

### Kill Conditions（夜班專用）

夜班排程每輪檢查 4 種自動停止條件：
1. 連續 N 輪 NEEDS_WORK 無改善
2. 修改超出定義範圍
3. 型別系統錯誤增加
4. 先前通過的測試失敗

**定義位置**：`~/.claude/commands/night-shift.md`

### Adaptive Quality Gates

quality-checker 根據任務類型動態調整 checklist（後端跳過 UI、實驗降低文件要求等）。

**定義位置**：`~/.claude/agents/quality-checker.md`

### Fresh Context Verification

quality-checker 在隔離 context 中運行，禁止接受 builder 自評，從原始需求重新驗證。

**定義位置**：`~/.claude/agents/quality-checker.md`

---

## 七、使用者日常指南

### 7.1 兩層循環架構

```
┌─ 外層：Session 循環（每次開 Claude Code 就是一個 session）───────────┐
│                                                                     │
│   /standup ──→ 工作 ──→ /done ──→ 關閉 Claude ──→ /standup ...      │
│                  │                                                   │
│                  ▼                                                   │
│   ┌─ 內層：Change 循環（一個 change 可能跨多個 session）──────────┐   │
│   │                                                              │   │
│   │   explore ──→ propose ──→ apply ──→ archive                  │   │
│   │      │                      │          │                     │   │
│   │      │            （可能跨 session）     │                     │   │
│   │      │                      │          │                     │   │
│   │      └──── next change ─────┴──────────┘                     │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   不需要 change 的工作（quick fix、探索、一次性任務）                    │
│   → 直接跟 Claude 對話，不走 OpenSpec                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

接合點：
- `/standup` 顯示 active changes 狀態，引導使用者進入 OpenSpec 流程
- `/done` 同步 OpenSpec tasks 的完成狀態到 Central Command
- `/kickoff` 執行 `openspec init` 初始化專案的 OpenSpec 環境

### 7.2 一天的完整流程

```
早上開工                    工作中                     收工
   │                         │                         │
   /standup                  自然對話                   /done
   │                         │                         │
   ├─ 看上次做到哪            ├─ subagent 自動派遣       ├─ 摘要本次工作
   ├─ 看目前各專案進度         ├─ /progress 隨時更新      ├─ sync OpenSpec tasks
   ├─ 看 active changes      ├─ /opsx:apply 繼續實作    ├─ 更新 Dashboard
   ├─ 看即將到期的 deadline    └─ 用 skills 執行任務      └─ 存知識到記憶庫
   └─ 討論今天做什麼
```

### 7.3 情境一：從零開始一個新專案

```
你：/kickoff

Agent：想建立什麼專案？

你：我要投一篇關於 medical image segmentation 的會議論文，deadline 是 6 月底

Agent：好，專案 ID 建議用 med-seg-paper。規劃如下：
  med-seg-paper ─── 預計 10 週
  ├── Phase 1: 文獻調研（1 週）
  ├── Phase 2: 方法設計（1 週）
  ├── Phase 3: 程式碼實作（2 週）
  ├── Phase 4: 實驗與調參（2 週）
  ├── Phase 5: 論文撰寫（2 週）
  └── Phase 6: 投稿準備（1 週）

  這樣 OK 嗎？

你：OK

Agent：已建立：
  - 資料夾：/mnt/d/WorkSpace/med-seg-paper/
  - CLAUDE.md 已生成（含檔案規範 + 進度追蹤）
  - 註冊到 Central Command（6 個 milestones）
  - 截止日 6/30 已設定
  下一步：在 VS Code 開啟 med-seg-paper/，執行 /standup 開始工作
```

### 7.4 情境二：每天開工（已有專案）

```
（在 macs-paper/ 資料夾開啟 Claude Code）

你：/standup

Agent：
  上次活動：
  - 完成 attention mechanism 文獻調研
  - 修復 data loader shape mismatch

  目前進度：
  MACS 會議論文 ─── 35%（in_progress）
  ├── 實驗設計與執行 ─── 50%
  ├── 論文撰寫 ─── 20%
  └── 投稿準備 ─── 0%

  即將到期：
  - MACS 投稿截止（3/15）── 剩 7 天

  今天想做什麼？建議：
  - 繼續實驗 → 派遣 ai-engineer subagent
  - 開始寫論文 → 直接開始或派遣 scientific-researcher
  - 做進度簡報 → 使用 /ppt-gen 或派遣 ppt-agent

你：繼續做實驗，跑 ablation study

Agent：好，開始 ablation study 吧！
```

### 7.5 情境三：Subagent 自主派遣

在任何模式下，明確的獨立任務會自動派遣 subagent：

```
你：幫我找 UNet 和 TransUNet 的最新改進版本

Agent：（自動派遣 scientific-researcher subagent）
      找到以下 5 篇相關論文：
      1. nnU-Net v2 (2024) - 自適應架構搜尋...
      2. Swin-UNet (2024) - Swin Transformer + U 形結構...

你：做成 AIIA 模板的投影片

Agent：（使用 /slide-planner 規劃結構，再用 /ppt-gen-aiia 生成）
      投影片已生成：ppt/swin-unet-overview.pptx
```

### 7.6 情境四：更新進度

```
你：/progress

Agent：
  MACS 會議論文 ─── 35%
  ├── 實驗設計與執行 ─── 50%
  ├── 論文撰寫 ─── 20%
  └── 投稿準備 ─── 0%

  有什麼進展要更新嗎？

你：ablation study 跑完了，accuracy 提升了 3%。method section 也寫了初稿。

Agent：整理一下：
  - 實驗：50% → 80%
  - 論文撰寫：20% → 35%
  - 總進度：35% → 45%
  這樣 OK 嗎？

你：實驗改成 85%

Agent：好，已寫入 Dashboard ✓
```

### 7.7 Command 速查表

| 我想... | 用什麼 |
|---------|--------|
| 開始新專案 | `/kickoff` |
| 早上開工，看該做什麼 | `/standup` |
| 討論並更新進度 | `/progress` |
| 結束這段工作 | `/done` |
| 探索想法、調查問題 | `/opsx:explore` |
| 開始做一個新功能 | `/opsx:propose <name>` |
| 繼續實作 change | `/opsx:apply <name>` |
| change 做完了 | `/opsx:archive <name>` |
| 修個小 bug、查資料 | 直接跟 Claude 對話 |
| 週回顧、深度分析 | progress-reviewer subagent |

---

## 八、系統價值

| 面向 | 沒有 Agentic Me | 有了 Agentic Me |
|------|----------------|-----------------|
| **知識管理** | 每次開新對話都要重新解釋 | AI 記得所有背景，直接開工 |
| **進度追蹤** | 靠腦子記，常常忘記做到哪 | Dashboard 一目了然 |
| **任務執行** | 手動切換工具、組織流程 | Main Agent 自動編排 Pipeline |
| **深度工作** | 被雜事打斷，難以專注 | 直接進入對應 Agent 深度工作 |
| **時間內耗** | 花大量時間在「想」而不是「做」 | 系統替你整理，你只需決策和執行 |
| **知識累積** | 經驗留在腦中，難以系統化 | 自動沉澱到記憶庫，持續增值 |

---

## 九、目前進度

### 已完成

**基礎設施**
- [x] memcp 記憶系統（graph.db + SessionStart 注入）
- [x] Central Command（Hono + Next.js + SQLite + MCP + WebSocket）
- [x] Dashboard 七個頁面（總覽/專案/專案詳情/Agent 管理/任務/記憶庫/截止日）
- [x] CC MCP Server 全域註冊

**Phase 1 專案追蹤升級（2026-03-08）**
- [x] 11 個全域 subagents
- [x] 4 個全域 session commands：/kickoff, /standup, /progress, /done
- [x] Startup hook 升級：memcp 記憶 + CC 最近活動注入
- [x] 記憶庫知識圖譜 3D 視覺化

**Phase 2 專案導向架構（2026-03-08）**
- [x] 從 Agent 資料夾轉為專案資料夾工作模式
- [x] `/kickoff` 改寫：建資料夾 + 生成 CLAUDE.md + 註冊 CC
- [x] 全域 CLAUDE.md 加入專案工作模式指引
- [x] 已安裝功能 Skills：research, ppt-gen, slide-planner, pdf, docx, notebooklm

**Agent 行為約束升級（2026-03-08，源自 fire-flow 設計模式）**
- [x] Circuit Breaker Protocol — 6 種 stuck 分類（debugger agent）
- [x] Honesty Protocol — 信心度校準 + Radical Honesty 規則（全域 CLAUDE.md）
- [x] Breadcrumb Protocol — memcp 新增 failure/lesson/pattern 三分類（全域 CLAUDE.md）
- [x] Kill Conditions + Recitation Pattern — 夜班自動停止 + 防 drift（night-shift command）
- [x] Fresh Context Verification + Adaptive Quality Gates — 隔離驗證 + 動態 checklist（quality-checker agent）
- [x] Server-side Circuit Breaker — 連續 3 次 failed 自動 disable 排程（schedules API + DB）
- [x] Dashboard Circuit Breaker 狀態顯示 — 失敗計數 + 觸發原因標記

### 待開發

**Phase 3：Dashboard 增強**
- [ ] 專案時間軸 / 甘特圖視覺化（milestone + 週計劃）
- [ ] 今日活動摘要面板
- [ ] Inbox 通知面板
- [ ] 進度 inline 編輯
- [ ] 統計圖表（任務趨勢）

**Phase 4：自動化**
- [ ] Post-task 自動反思 → memcp
- [ ] CC Server 自動啟動機制
- [ ] 現有 Agent 資料夾遷移到專案資料夾（內容搬移）
