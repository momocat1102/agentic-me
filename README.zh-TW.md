# Agentic Me — 個人 AI Agent 協作系統

[Claude Code](https://github.com/anthropics/claude-code) 的擴充套件，將其轉化為多 Agent 協作系統。透過中控台即時監控、管理與協調多個 Claude Code Agent，支援任務追蹤、記憶系統，以及像素風格的虛擬辦公室。

> **注意：** 本專案目前僅支援 Claude Code。它是 Claude Code 的擴充生態系統 — 運用其 skills、hooks、MCP servers 與 CLI 能力來協調多個 Agent。

<div align="center">
  <img src="docs/pixel-office-preview.png" alt="Pixel Office — AI Agent 們在虛擬辦公室工作" width="800" />
  <p><em>Pixel Office — 你的 AI Agent 們在溫馨的虛擬辦公室一起工作</em></p>
</div>

```
 ┌──────────────────────────────────────────┐
 │      Dashboard (Next.js, port 3000)      │
 │  總覽 │ 專案 │ 任務 │ 記憶庫              │
 │  Pixel Office │ 日誌 │ 排程               │
 └──────────────────┬───────────────────────┘
               WebSocket + REST
 ┌──────────────────┴───────────────────────┐
 │    Central Server (Hono, port 4000)      │
 │  SQLite │ memcp │ WS (port 4001)         │
 └──────────────────┬───────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     │              │              │
 ┌───┴────┐  ┌─────┴────┐  ┌─────┴────┐
 │Research│  │  Code    │  │  System  │ ...
 │ Agent  │  │  Agent   │  │  Agent   │
 └────────┘  └──────────┘  └──────────┘
```

---

## 功能特色

- **Pixel Office** — 互動式像素風虛擬辦公室，每個 Agent 以貓咪角色呈現，支援日夜循環、傢俱編輯器、粒子特效、蟲蟲生態系，以及子母畫面（Picture-in-Picture）
- **中控台 Dashboard** — 即時總覽所有 Agent 狀態、專案進度、任務、截止日與系統健康度
- **多 Agent 協調** — 註冊並協調多個 Claude Code Agent，各自擁有獨立工作區與能力
- **記憶系統** — 整合 [memcp](https://github.com/anthropics/memcp) 持久化記憶，搭配知識圖譜視覺化

<div align="center">
  <img src="docs/memory-graph-preview.png" alt="記憶知識圖譜 — 視覺化 Agent 記憶與連結" width="800" />
  <p><em>知識圖譜 — 視覺化 Agent 的記憶、決策及其語意關聯</em></p>
</div>

- **Night Shift 夜班模式** — 自動化背景任務排程，處理長時間 Agent 工作
- **Discord Bot** — 透過 Discord 遠端控制 Agent 並接收通知
- **PWA 支援** — 可安裝為桌面應用程式，支援離線使用
- **OpenSpec 工作流** — 結構化的提案 → 設計 → 實作變更流程
- **結構化日誌** — 集中式日誌檢視器，支援篩選

---

## 快速開始

### 前置需求

- Node.js >= 22
- Claude Code（`npm install -g @anthropic-ai/claude-code`）

### 安裝與啟動

```bash
# 複製專案
git clone https://github.com/momocat1102/agentic-me.git
cd agentic-me

# 安裝依賴
npm install

# 啟動（Server + Dashboard）
./start.sh
```

啟動後：
- Dashboard：http://localhost:3000
- Pixel Office：http://localhost:3000/pixel-office
- Server API：http://localhost:4000/api
- WebSocket：ws://localhost:4001

---

## Dashboard 頁面

| 頁面 | 路徑 | 說明 |
|------|------|------|
| 總覽 | `/` | 系統統計、Agent 狀態、專案進度、近期任務 |
| Pixel Office | `/pixel-office` | 互動式虛擬辦公室與 Agent 角色 |
| 專案 | `/projects` | 專案進度追蹤，整合 OpenSpec |
| 任務 | `/tasks` | 任務歷史紀錄，可依 Agent 篩選 |
| 記憶庫 | `/memory` | 知識圖譜（Sigma.js）+ 記憶瀏覽器 |
| 日誌 | `/logs` | 結構化日誌檢視，支援等級/來源篩選 |
| 截止日 | `/deadlines` | 截止日管理與倒數計時 |
| 排程 | `/schedules` | Night Shift 排程管理 |

---

## Agent 註冊

Agent 在 `agents.json` 中註冊：

```json
{
  "agents": [
    {
      "id": "research-agent",
      "name": "Research Agent",
      "role": "深度搜尋與調研",
      "path": "/path/to/research-agent"
    }
  ]
}
```

完整範例請參考 `agents.json.example`。

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | Hono + TypeScript |
| 資料庫 | better-sqlite3 |
| 前端 | Next.js + React + Tailwind CSS 4 |
| 圖譜視覺化 | Sigma.js + Graphology |
| 即時通訊 | WebSocket |
| 記憶系統 | memcp（MCP Server） |
| Pixel Office | HTML5 Canvas + 自製 Sprite 引擎 |

---

## 專案結構

```
agentic-me/
├── server/                   # 後端（Hono + TypeScript + SQLite）
│   └── src/
│       ├── index.ts          # 進入點
│       ├── routes/           # REST API 路由
│       ├── services/         # 商業邏輯
│       └── discord-bot/      # Discord Bridge Bot
│
├── dashboard/                # 前端（Next.js + React + Tailwind）
│   └── src/
│       ├── app/              # 頁面（總覽、Pixel Office、專案等）
│       ├── components/       # 可重用 UI 元件
│       └── lib/
│           ├── api.ts        # API 客戶端 + WebSocket
│           └── pixel-office/ # Pixel Office 遊戲引擎
│
├── openspec/                 # 變更提案與規格
├── scripts/                  # 工具腳本
├── docs/                     # 文件
├── agents.json               # Agent 註冊清單
└── start.sh                  # 啟動腳本
```

---

## 致謝

本專案建構於以下優秀的開源專案與素材之上：

### 核心基礎設施
- [Claude Code](https://github.com/anthropics/claude-code) — Anthropic 的 AI 程式開發 Agent
- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/sdk) — AI 工具整合協定
- [memcp](https://github.com/anthropics/memcp) — Claude Code 的持久化記憶系統
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) — Claude Code 的結構化變更管理工作流
- [OpenClaw](https://github.com/danleetw/OpenClaw-bot-review) — OpenClaw 的可視化介面，用於 Claude Code

### 後端
- [Hono](https://github.com/honojs/hono) — 輕量級 Web 框架
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — 高效能 Node.js SQLite3 驅動
- [discord.js](https://github.com/discordjs/discord.js) — Discord 機器人框架

### 前端
- [Next.js](https://github.com/vercel/next.js) — React 框架
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) — Utility-first CSS 框架
- [Sigma.js](https://github.com/jacomyal/sigma.js) + [Graphology](https://github.com/graphology/graphology) — 圖譜視覺化
- [Recharts](https://github.com/recharts/recharts) — React 圖表元件庫
- [Three.js](https://github.com/mrdoob/three.js) — 3D 視覺化

### Pixel Office 素材
- [Neko Cafe Asset Pack](https://hellorumin.itch.io/neko-cafe-asset-pack) by HelloRumin — 磁磚、傢俱與貓咪 Sprite
- [Animated Pixel Kittens](https://last-tick.itch.io/animated-pixel-kittens-cats-32x32) by Last Tick — 寵物貓動畫

---

## 授權條款

MIT
