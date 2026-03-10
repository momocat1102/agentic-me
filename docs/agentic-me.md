# Agentic Me — 個人 AI Agent 協作系統

> 最後更新：2026-03-10（Agent 行為約束升級：Circuit Breaker + Honesty Protocol）

---

## 一、系統願景

建立一套以**個人知識庫**為核心的多 Agent 協作系統。每個 Agent 各司其職處理不同專案與事務，所有互動過程中產生的知識自動沉澱到記憶庫，最終形成一個真正理解你、越用越聰明的**個人 AI 助理團隊**。

核心理念：**你的每一次對話都不浪費，每一段思考都變成資產。**

---

## 二、系統架構

```
┌─────────────────────────────────────────────────────────────────────┐
│                              使用者                                   │
│                               │                                      │
│                    在專案資料夾中開啟 Claude Code                      │
│                               ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              專案資料夾 (Claude Code session)                   │  │
│  │  my-research-paper/ / my-thesis/ / web-platform/ / ...         │  │
│  │                                                               │  │
│  │  CLAUDE.md（專案 context + 檔案規範 + 進度追蹤）                │  │
│  │                                                               │  │
│  │  工具層（全域共用）：                                           │  │
│  │  ├─ Expert Skills（/switch 切換專家知識）                       │  │
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

以**專案資料夾**為中心，而非以 Agent 資料夾為中心。每個專案有自己的 CLAUDE.md，定義專案 context 和檔案規範。專業能力透過 **Expert Skills** 和 **Subagents** 按需注入。

```
專案資料夾（工作空間）
├── CLAUDE.md              <- 專案 context（唯一必建）
└── （子目錄按需建立）
    ├── workbase/          <- 程式碼
    ├── paper/             <- 論文
    ├── ppt/               <- 投影片
    ├── data/              <- 資料
    ├── docs/              <- 筆記、文獻
    └── outputs/           <- 最終產出
```

### 3.2 專案清單（範例）

| 專案 ID | 名稱 | 路徑 |
|---------|------|------|
| `my-research-paper` | 會議論文 | `$WORKSPACE_DIR/my-research-paper/` |
| `my-thesis` | 畢業論文 | `$WORKSPACE_DIR/my-thesis/` |
| `web-platform` | Web 平台開發 | `$WORKSPACE_DIR/web-platform/` |
| `team-meeting` | 每週 Meeting | （在對應專案內處理） |
| `quarterly-report` | 季報 / 定期報告 | （在對應專案內處理） |
| `system-agent` | Agentic Me 系統 | `$WORKSPACE_DIR/system-agent/` |

新專案透過 `/kickoff` 建立，自動生成資料夾 + CLAUDE.md + 註冊到 CC。

### 3.3 Expert Skills（專家知識切換）

透過 `/switch <expert>` 注入專家知識到當前對話，主 Agent「變身」為該領域專家。

| Expert | 指令 | 用途 |
|--------|------|------|
| AI 工程 | `/switch ai-engineer` | 模型訓練、推論優化、實驗設計 |
| 研究方法論 | `/switch research` | 文獻調研、證據綜合 |
| 論文寫作 | `/switch paper` | 學術論文撰寫、投稿準備 |
| 網站開發 | `/switch web-dev` | 前後端開發 |
| 簡報製作 | `/switch ppt` | 投影片設計與生成 |
| 除錯 | `/switch debug` | 系統性診斷與修復 |
| 程式碼審查 | `/switch code-review` | 品質、安全、最佳實踐 |
| 數據分析 | `/switch data-analysis` | 資料處理、統計、視覺化 |

專家知識檔位於 `~/.claude/experts/`，不是 commands（不佔啟動 context）。

**切換時的完整流程**：
1. **Phase 1 收尾**：總結工作 → 回報進度到 CC → 更新 CLAUDE.md
2. **Phase 2 Compact**：觸發 `/compact`（PreCompact hook 自動提取知識到 memcp）
3. **Phase 3 注入**：讀取新專家知識檔 → 告知摘要 → 開始新工作

### 3.4 Subagents（自主派遣）

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

### 3.5 Expert Skill vs Subagent：兩層架構

| | Expert Skill（/switch） | Subagent（派遣） |
|---|---|---|
| 互動方式 | 互動式協作，一步步跟你討論 | 自主執行，完成後回傳結果 |
| Context | 注入到主 Agent，共用 context | 獨立 context（不影響主 session） |
| Model | 使用主 Agent 的 model | 可指定不同 model（省成本） |
| 適合 | 諮詢、討論、需要來回的工作 | 明確任務、大型獨立工作 |
| 知識位置 | `~/.claude/experts/` | `~/.claude/agents/` |

**使用時機判斷**：
- 「幫我想一下怎麼設計」→ `/switch ai-engineer`（需要互動討論）
- 「幫我寫一個 data loader」→ 派遣 ai-engineer subagent（明確任務）

### 3.6 已安裝的 Skills（功能型）

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

### 4.1 組成

| 項目 | 位置 |
|------|------|
| MCP Server | `~/.claude/mcp-servers/memcp/` (Claude Code native MCP) |
| 資料庫 | `~/.memcp/graph.db` (SQLite 圖譜結構) |
| 使用規則 | `~/.claude/CLAUDE.md` 中定義 |

### 4.2 記憶工具

| 工具 | 用途 |
|------|------|
| `memcp_remember` | 存入新記憶 |
| `memcp_recall` | 按查詢檢索記憶 |
| `memcp_search` | 多層搜尋 (BM25 + 語義) |
| `memcp_forget` | 刪除記憶 |
| `memcp_related` | 圖譜關聯查詢 |
| `memcp_reinforce` | 調整記憶權重 |
| `memcp_consolidate` | 合併重複記憶 |
| `memcp_load_context` | 存入大段內容 |
| `memcp_retention_run` | 清理過期記憶 |

### 4.3 記憶分類規則

**Scope 選擇：**

| Scope | 說明 | 範例 |
|-------|------|------|
| `global` | 跨專案通用 | 偏好 functional 寫法、回覆用繁體中文 |
| `project` | 特定專案限定 | 此專案用 PyTorch、這個專案用 pnpm |

判斷口訣：換到另一個專案這條記憶還有用嗎？有用 → global，沒用 → project

**重要性等級：** `critical` > `high` > `medium` > `low`

**分類：** `decision` / `fact` / `preference` / `finding` / `failure` / `lesson` / `pattern` / `todo` / `general`

**Breadcrumb 三分類（源自 fire-flow 設計模式）：**
- `failure`：失敗記錄（症狀 + 根因 + 解法 + 不要重試的條件）
- `lesson`：成功經驗（做法 + 適用場景 + 為何有效）
- `pattern`：跨專案可複用的模式（問題類型 + 解法模板）

### 4.4 記憶的威力：越用越聰明

```
第 1 週：知道你是誰、在做什麼專案
第 1 個月：了解你的工作習慣、技術偏好、寫作風格
第 3 個月：掌握所有專案的歷史脈絡、關鍵決策、踩過的坑
第 6 個月：成為真正理解你的 AI 助理，回覆精準度大幅提升
```

---

## 五、Central Command（進度追蹤中心）

### 5.1 Server

| 項目 | 值 |
|------|-----|
| 位置 | `$WORKSPACE_DIR/system-agent/` (monorepo: server + dashboard) |
| 框架 | Hono 4.7.4 + TypeScript |
| HTTP | `localhost:4000` |
| WebSocket | `localhost:4001` |
| 資料庫 | `server/data/central-command.db` (SQLite) |
| 啟動方式 | `cd $WORKSPACE_DIR/system-agent && bash start.sh` |

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
| 啟動方式 | `cd $WORKSPACE_DIR/system-agent && bash start.sh` |

| 頁面 | 路徑 | 功能 |
|------|------|------|
| 總覽 | `/` | Stats + Agent 卡片 + 專案進度 + 截止日 + 最近活動 |
| 專案 | `/projects` | 專案卡片（進度 + 任務數 + 參與 Agent），點擊進入詳情 |
| 專案詳情 | `/projects/:id` | 進度追蹤 + 參與 Agent + 近期任務 + 截止日 |
| Agent 管理 | `/agents` | 檢視每個 Agent 的 Skills / Commands / MCP Tools 能力配置 |
| 任務紀錄 | `/tasks` | 歷史任務表格，可按 Agent 和專案篩選 |
| 記憶庫 | `/memory` | 知識圖譜視覺化（3D Force Graph）+ 記憶列表搜尋篩選 |
| 截止日 | `/deadlines` | CRUD 管理截止日 |
| 排程 | `/schedules` | 夜班排程管理 + Circuit Breaker 狀態 |

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

| Command | 用途 | 使用場景 |
|---------|------|---------|
| `/kickoff` | 建立新專案（資料夾 + CLAUDE.md + 註冊 CC） | 開始一個全新的專案 |
| `/standup` | 早報：回顧上次進度，規劃今天做什麼 | 每天開工的第一件事 |
| `/switch <expert>` | 專家切換（收尾 → compact → 注入新知識） | 切換工作類型時 |
| `/progress` | 對話式討論並更新進度 | 工作途中想記錄進展 |
| `/review` | 每日/週回顧：歸納成果 + 建議下一步 | 一天或一週結束時 |
| `/done` | 進度回報 + 知識提取 | 單次工作結束 |
| `/overview` | 查看全局狀態 | 快速掃一眼所有專案 |
| `/night-shift` | 啟動夜班自主執行 | 長時間背景任務 |

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

以下行為約束定義在 experts / agents / commands 的 .md 文件中，由 Claude 自主遵循。

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

**定義位置**：`~/.claude/experts/debug.md`、`~/.claude/agents/debugger.md`

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

### 7.1 一天的完整流程

```
早上開工                    工作中                     收工
   │                         │                         │
   /standup                  自然對話                   /review 或 /done
   │                         │                         │
   ├─ 看上次做到哪            ├─ /switch 切換專家模式     ├─ 歸納今天成果
   ├─ 看目前各專案進度         ├─ subagent 自動派遣       ├─ 更新 Dashboard
   ├─ 看即將到期的 deadline    ├─ /progress 隨時更新      ├─ 存知識到記憶庫
   └─ 討論今天做什麼           └─ 用 skills 執行任務      └─ 建議明天做什麼
```

### 7.2 情境一：從零開始一個新專案

```
你：/kickoff

Agent：想建立什麼專案？

你：我要投一篇關於 medical image segmentation 的會議論文，deadline 是 6 月底

Agent：好，專案 ID 建議用 my-research-paper。規劃如下：
  my-research-paper ─── 預計 10 週
  ├── Phase 1: 文獻調研（1 週）
  ├── Phase 2: 方法設計（1 週）
  ├── Phase 3: 程式碼實作（2 週）
  ├── Phase 4: 實驗與調參（2 週）
  ├── Phase 5: 論文撰寫（2 週）
  └── Phase 6: 投稿準備（1 週）

  這樣 OK 嗎？

你：OK

Agent：已建立：
  - 資料夾：$WORKSPACE_DIR/my-research-paper/
  - CLAUDE.md 已生成（含檔案規範 + 進度追蹤）
  - 註冊到 Central Command（6 個 milestones）
  - 截止日 6/30 已設定
  下一步：在 VS Code 開啟 my-research-paper/，執行 /standup 開始工作
```

### 7.3 情境二：每天開工（已有專案）

```
（在 my-research-paper/ 資料夾開啟 Claude Code）

你：/standup

Agent：
  上次活動：
  - 完成 attention mechanism 文獻調研
  - 修復 data loader shape mismatch

  目前進度：
  會議論文 ─── 35%（in_progress）
  ├── 實驗設計與執行 ─── 50%
  ├── 論文撰寫 ─── 20%
  └── 投稿準備 ─── 0%

  即將到期：
  - 投稿截止（3/15）── 剩 7 天

  今天想做什麼？建議：
  - 繼續實驗 → /switch ai-engineer
  - 開始寫論文 → /switch paper
  - 做進度簡報 → /switch ppt

你：繼續做實驗，跑 ablation study

你：/switch ai-engineer
Agent：已進入 AI Engineer 模式。開始吧！
```

### 7.4 情境三：工作中切換專家

```
（在 AI Engineer 模式下完成了實驗程式碼）

你：程式碼寫好了，來寫論文吧
你：/switch paper

Agent：
  【Phase 1 收尾】
  上一段工作摘要：完成 ablation study 實驗腳本，存放在 workbase/ablation.py
  已回報進度到 Central Command。

  【Phase 2 Compact】
  正在清理 context...
  已提取 2 條知識到記憶庫。

  【Phase 3 切換】
  已切換到論文寫作模式。

  上一段工作摘要：完成了 ablation study 實驗腳本。
  現在可以開始論文工作了。需要什麼？

你：幫我寫 Method section

Agent：（以論文寫作專家身份協助撰寫，產出放在 paper/ 目錄）
```

### 7.5 情境四：Subagent 自主派遣

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

### 7.6 情境五：更新進度

```
你：/progress

Agent：
  會議論文 ─── 35%
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

Agent：好，已寫入 Dashboard。
```

### 7.7 Command 速查表

| 我想... | 用什麼 |
|---------|--------|
| 開始新專案 | `/kickoff` |
| 早上開工，看該做什麼 | `/standup` |
| 切換專家模式 | `/switch <expert>` |
| 快速看全部進度 | `/overview` |
| 討論並更新進度 | `/progress` |
| 回顧今天/這週做了什麼 | `/review` |
| 結束這段工作 | `/done` |
| 在背景自主執行長任務 | `/night-shift` |

| 可用的專家模式 | |
|---|---|
| `ai-engineer` | AI/ML 工程 |
| `research` | 研究方法論 |
| `paper` | 論文寫作 |
| `web-dev` | 網站開發 |
| `ppt` | 簡報製作 |
| `debug` | 除錯 |
| `code-review` | 程式碼審查 |
| `data-analysis` | 數據分析 |

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
- [x] Dashboard 八個頁面（總覽/專案/專案詳情/Agent 管理/任務/記憶庫/截止日/排程）
- [x] CC MCP Server 全域註冊

**Phase 1 專案追蹤升級（2026-03-08）**
- [x] 11 個全域 subagents
- [x] 7 個全域 commands：/kickoff, /standup, /progress, /review, /done, /overview, /switch
- [x] Startup hook 升級：memcp 記憶 + CC 最近活動注入
- [x] 記憶庫知識圖譜 3D 視覺化

**Phase 2 專案導向架構（2026-03-08）**
- [x] 從 Agent 資料夾轉為專案資料夾工作模式
- [x] 8 個 Expert Skills（`~/.claude/experts/`）：ai-engineer, research, paper, web-dev, ppt, debug, code-review, data-analysis
- [x] `/switch` 改寫：收尾 → compact（觸發 PreCompact hook 自動知識提取） → 注入新專家知識
- [x] `/kickoff` 改寫：建資料夾 + 生成 CLAUDE.md + 註冊 CC
- [x] `/standup` 微調：加入 `/switch` 專家建議
- [x] 全域 CLAUDE.md 加入專案工作模式指引
- [x] 已安裝功能 Skills：research, ppt-gen, slide-planner, pdf, docx, notebooklm

**Agent 行為約束升級（2026-03-08，源自 fire-flow 設計模式）**
- [x] Circuit Breaker Protocol — 6 種 stuck 分類（debug expert + debugger agent）
- [x] Honesty Protocol — 信心度校準 + Radical Honesty 規則（全域 CLAUDE.md）
- [x] Breadcrumb Protocol — memcp 新增 failure/lesson/pattern 三分類（全域 CLAUDE.md）
- [x] Kill Conditions + Recitation Pattern — 夜班自動停止 + 防 drift（night-shift command）
- [x] Fresh Context Verification + Adaptive Quality Gates — 隔離驗證 + 動態 checklist（quality-checker agent）
- [x] Server-side Circuit Breaker — 連續 3 次 failed 自動 disable 排程（schedules API + DB）
- [x] Dashboard Circuit Breaker 狀態顯示 — 失敗計數 + 觸發原因標記

**夜班排程系統（2026-03-10）**
- [x] Dashboard /schedules 頁面：新增/編輯/刪除排程、啟動/停止夜班、查歷史
- [x] launch-night-shift.sh：自動開 tmux + 輸入指令 + 偵測 Claude 就緒
- [x] /night-shift command：純執行模式，curl 回報進度
- [x] Circuit Breaker：連續 3 次 failed 自動 disable，Dashboard 顯示狀態
- [x] DB 持久化：graceful shutdown + WAL checkpoint

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
