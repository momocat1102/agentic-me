# Central Command — Agentic Me 系統中控台

管理多個 Claude Code Agent 的協作系統：Agent 狀態監控、能力管理、進度追蹤、截止日管理、記憶庫瀏覽。

```
 ┌──────────────────────────────────────────┐
 │      Dashboard (Next.js, port 3000)      │
 │  總覽 │ Agent管理 │ 任務 │ 記憶庫 │ 截止日 │
 └──────────────────┬───────────────────────┘
               WebSocket + REST
 ┌──────────────────┴───────────────────────┐
 │    Central Server (Hono, port 4000)      │
 │  SQLite │ memcp LanceDB │ WS (port 4001)│
 └──────────────────┬───────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     │              │              │
 ┌───┴────┐  ┌─────┴────┐  ┌─────┴────┐
 │Research│  │  Paper   │  │  PPT     │ ...
 │ Agent  │  │  Agent   │  │  Agent   │
 └────────┘  └──────────┘  └──────────┘
```

---

## 快速開始

### 前置需求

- Node.js >= 22
- Claude Code（`npm install -g @anthropic-ai/claude-code`）

### 安裝與啟動

```bash
cd /mnt/d/WorkSpace/system-agent

# 安裝依賴
npm install

# 啟動（同時啟動 Server + Dashboard）
./start.sh
# 或
npm run dev
```

啟動後：
- Dashboard: http://localhost:3000
- Server API: http://localhost:4000/api
- WebSocket: ws://localhost:4001

---

## Dashboard 頁面

### 總覽（`/`）
系統首頁，一覽所有資訊：
- 統計卡片：即將到期、進行中專案、本週完成任務、記憶庫總數
- Agent 團隊狀態
- 專案進度面板
- 即將到期的截止日
- 最近任務活動

### Agent 管理（`/agents`）
查看每個 Agent 的能力配置：
- **Skills**：Agent 可用的 Claude Code skills（如 `/research`、`/ppt-gen`、`/pdf`）
- **Commands**：自訂命令（全域 + 專案級），如 `/progress`、`/done`
- **MCP Tools**：可存取的 MCP 工具，按 server 分組（memcp、playwright、central-command）

能力資料透過即時掃描各 Agent workspace 取得，點擊卡片展開查看詳細。

### 任務紀錄（`/tasks`）
瀏覽已完成任務的歷史記錄，可按 Agent 篩選。

### 記憶庫（`/memory`）
瀏覽 memcp 記憶系統的內容：
- **知識圖譜**：以 Sigma.js 視覺化記憶節點之間的關聯（語義、時序、因果、實體關係）
- **記憶列表**：搜尋、篩選、分頁瀏覽所有記憶條目
- 支援按 project、category、importance 篩選

### 截止日（`/deadlines`）
管理截止日期：建立、更新、刪除、標記完成。顯示倒數天數。

---

## Agent 註冊

所有 Agent 在 `agents.json` 中註冊：

```json
{
  "agents": [
    {
      "id": "research-agent",
      "name": "Research Agent",
      "role": "深度搜尋與調研",
      "path": "/mnt/d/WorkSpace/research-agent"
    }
  ]
}
```

每個 Agent 的能力由其 workspace 中的檔案決定：
- `CLAUDE.md` 中的「可用 Skills」區塊 → Skills
- `.claude/commands/*.md` → Project-level Commands
- `.claude/settings.json` → Project-level MCP 設定
- 全域設定（`~/.claude/settings.json`、`~/.claude/commands/`）自動繼承

---

## API 文件

### Agent 管理

```bash
# 列出所有 Agent
GET /api/agents

# 取得單一 Agent
GET /api/agents/:id

# 掃描所有 Agent 的能力（skills/commands/MCP tools）
GET /api/agents/capabilities

# 掃描單一 Agent 的能力
GET /api/agents/:id/capabilities
```

### 任務紀錄

```bash
# 列出任務歷史
GET /api/tasks
GET /api/tasks?agentId=research-agent&limit=20

# 記錄已完成任務（由 MCP 呼叫）
POST /api/tasks
```

### 進度追蹤

```bash
# 列出進度項目
GET /api/progress
GET /api/progress?project=macs-paper

# 建立 / 更新 / 刪除
POST /api/progress
PUT /api/progress/:id
DELETE /api/progress/:id
```

### 截止日管理

```bash
# 列出截止日
GET /api/deadlines
GET /api/deadlines?status=upcoming

# 建立 / 更新 / 刪除
POST /api/deadlines
PUT /api/deadlines/:id
DELETE /api/deadlines/:id
```

### 記憶庫（唯讀，資料來自 memcp）

```bash
# 列出記憶
GET /api/memory
GET /api/memory?project=macs-paper&category=decision&limit=50

# 搜尋記憶
GET /api/memory/search?q=keyword

# 統計
GET /api/memory/stats

# 知識圖譜資料（節點 + 邊）
GET /api/memory/graph
GET /api/memory/graph?project=macs-paper
```

### 事件 / 健康檢查

```bash
GET /api/events
GET /api/events?agentId=research-agent
GET /api/health
```

---

## 專案結構

```
system-agent/
├── package.json              # monorepo (npm workspaces)
├── agents.json               # Agent 註冊清單
├── start.sh                  # 一鍵啟動腳本
├── CLAUDE.md                 # System Agent 指令
│
├── server/                   # 後端 (Hono + TypeScript + SQLite)
│   └── src/
│       ├── index.ts          # 進入點、初始化
│       ├── config.ts         # 環境設定
│       ├── db/schema.ts      # SQLite schema + migration
│       ├── routes/
│       │   ├── agents.ts     # Agent 管理 + 能力掃描
│       │   ├── tasks.ts      # 任務紀錄
│       │   ├── progress.ts   # 進度追蹤
│       │   ├── deadlines.ts  # 截止日管理
│       │   ├── events.ts     # 事件查詢
│       │   └── memory.ts     # 記憶庫瀏覽
│       ├── services/
│       │   ├── capability-scanner.ts  # Agent 能力掃描
│       │   ├── task-recorder.ts       # 任務記錄
│       │   ├── event-store.ts         # 事件存儲
│       │   ├── health-checker.ts      # 健康檢查
│       │   ├── memory-browser.ts      # memcp 記憶讀取
│       │   └── ws-broadcaster.ts      # WebSocket 廣播
│       ├── mcp-server.ts     # MCP Server（供 Agent 呼叫）
│       └── types/index.ts    # TypeScript 型別
│
├── dashboard/                # 前端 (Next.js 16 + React 19 + Tailwind 4)
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # 總覽
│       │   ├── agents/page.tsx       # Agent 管理
│       │   ├── tasks/page.tsx        # 任務紀錄
│       │   ├── memory/page.tsx       # 記憶庫（圖譜 + 列表）
│       │   ├── deadlines/page.tsx    # 截止日管理
│       │   └── layout.tsx            # 共用導航
│       ├── components/
│       │   ├── AgentCard.tsx          # Agent 狀態卡片
│       │   ├── CapabilityPanel.tsx    # Agent 能力面板
│       │   ├── ProgressCard.tsx       # 進度卡片
│       │   ├── TaskHistory.tsx        # 任務歷史表
│       │   ├── DeadlineList.tsx       # 截止日清單
│       │   ├── MemoryBrowser.tsx      # 記憶列表
│       │   ├── MemoryGraph.tsx        # 記憶知識圖譜
│       │   └── SigmaGraph.tsx         # Sigma.js 整合
│       └── lib/api.ts                 # API client + WebSocket
│
└── server/data/              # SQLite 資料庫（自動生成）
```

---

## 技術棧

| 層級 | 技術 |
|------|------|
| Server | Hono 4.7.4 + TypeScript |
| 資料庫 | better-sqlite3（任務/進度/截止日）+ LanceDB（memcp 記憶） |
| Dashboard | Next.js 16 + React 19 + Tailwind CSS 4 |
| 圖譜視覺化 | Sigma.js 3.0 + Graphology |
| 即時通訊 | WebSocket (ws) |
| 記憶系統 | memcp（外部 MCP Server） |

---

## 常見問題

### Dashboard 顯示連線失敗？
Server（port 4000）沒啟動。執行 `./start.sh` 或 `npm run dev`。

### Agent 能力資訊不正確？
能力掃描是即時讀取各 Agent workspace 的檔案。確認該 Agent 的 `CLAUDE.md` 有正確的「可用 Skills」區塊。

### 記憶庫頁面沒資料？
確認 memcp MCP Server 正在運行，且 `~/.memcp/graph.db` 存在。

### Health checker 顯示 offline？
Health checker 每 30 秒檢查一次 Claude CLI 狀態。Agent 沒有在運行中的 session 時會顯示 offline，這是正常的。
