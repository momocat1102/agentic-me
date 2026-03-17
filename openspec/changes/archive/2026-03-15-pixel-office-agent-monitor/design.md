## Context

Central Command 目前透過 Hono server (port 4000) + Next.js dashboard (port 3000) 提供 Agent 管理、任務追蹤、排程管理等功能。Dashboard 以表格/列表呈現，缺乏即時視覺化監控。

OpenClaw-bot-review 的 Pixel Office 是一個成熟的 Canvas 像素動畫系統，包含：
- **渲染器**：z-sort drawable、Sprite 快取、offscreen canvas
- **角色 FSM**：idle → walk → type 三態，含漫步、座位、互動邏輯
- **Sprite 系統**：string[][] 像素資料 + HSL 著色 + zoom-level 快取
- **家具互動**：點擊觸發資訊面板（白板、電腦、書架等）
- **資料橋接**：agentBridge 輪詢 API → 同步到 OfficeState

目標是將此引擎移植到 Central Command Dashboard，替換資料來源為 CC 的 API。

## Goals / Non-Goals

**Goals:**
- 在 Dashboard 新增 Pixel Office 頁面，Agent 以像素角色呈現
- 即時反映 Agent 活動狀態（working/idle/offline）
- 家具互動顯示 CC 系統資訊（專案進度、任務、排程等）
- 與既有 WebSocket 整合，狀態變更即時推送

**Non-Goals:**
- 不實作 OpenClaw 特有功能（Gateway SRE 角色、platform test、告警系統）
- 不重寫動畫引擎——盡量直接移植，只改資料層
- 不新增行動裝置支援（Canvas 像素辦公室在小螢幕效果不佳）
- 不做 Pixel Office 的編輯器（家具擺設固定）

## Decisions

### 1. 動畫引擎移植策略：直接移植 + 改造資料層

**選擇**：將 `lib/pixel-office/` 整包移植到 `dashboard/src/lib/pixel-office/`，保留 Canvas 渲染器、Sprite 系統、角色 FSM，只替換 `agentBridge.ts` 為 CC 版本。

**替代方案**：
- 從頭用 React 動畫庫（Framer Motion）重寫 → 開發量大，且像素風 Canvas 效果難以用 DOM 動畫還原
- 用 WebGL/PixiJS → 過度工程，原版純 Canvas 2D 已夠用

**理由**：原版引擎成熟度高（2300+ 行 page.tsx、2100+ 行 officeState.ts），直接移植風險最低。

### 2. Agent 活動偵測：JSONL 掃描 + 快取

**選擇**：新增 server-side `/api/agents/activity` 端點，掃描 `~/.claude/projects/` 下各專案的 JSONL session 檔案，判斷最近 5 分鐘是否有新 assistant message。結果快取 30 秒。

**替代方案**：
- Hook-based 回報（Agent stop hook 回報狀態）→ 只能偵測結束，無法偵測「正在執行中」
- 監控 Claude CLI process（`ps aux | grep claude`）→ 不穩定，subagent 難區分

**理由**：JSONL 是 Claude Code 的 ground truth，檔案修改時間 + 最後 message 時間戳可精確判斷活動狀態。快取避免頻繁 I/O。

### 3. 即時推送：複用 WebSocket + 定時掃描

**選擇**：Server 每 30 秒掃描一次 Agent 活動狀態，狀態變更時透過既有 WS broadcaster 推送 `agent:activity` 事件。Dashboard Pixel Office 頁面監聽此事件更新動畫。

**替代方案**：
- 純輪詢（前端每 N 秒 fetch）→ 延遲高、浪費頻寬
- inotify 監控 JSONL 檔案變更 → 跨平台複雜度高（WSL2 上 inotify 不穩定）

**理由**：30 秒間隔足夠反映 Agent 狀態（非毫秒級需求），且複用既有 WS 基礎設施零額外成本。

### 4. 家具互動映射

| 家具 | 互動內容 | 資料來源 |
|------|----------|----------|
| 白板 📊 | 專案進度總覽 | GET /api/projects |
| 電腦 💻 | 最近完成的任務 | GET /api/tasks?limit=5 |
| 時鐘 🕐 | 排程狀態 | GET /api/schedules |
| 書架 📚 | Agent 能力列表 | GET /api/agents/capabilities |
| Server 🖥️ | 系統健康狀態 | GET /api/health |
| 沙發 🛋️ | 閒置最久的 Agent | 計算自 activity API |
| 電話 📱 | 系統版本資訊 | 靜態 |

### 5. 頁面結構

```
/pixel-office
├── Agent Chip Bar（頂部，每個 agent 一個狀態 chip）
├── Canvas 場景（主區域，辦公室動畫）
└── 互動面板（底部/側邊 popover，點擊家具彈出）
```

## Risks / Trade-offs

**[Canvas 效能]** → 在 Agent 數量多（>10）時，Canvas 繪製和 Sprite 快取可能影響效能。Mitigation：頁面不在前台時暫停 requestAnimationFrame；idle 時降低 FPS 至 15。

**[JSONL 掃描 I/O]** → 大量 session 檔案可能造成掃描緩慢。Mitigation：只掃描最近 24 小時的檔案（按 mtime 過濾）；30 秒快取。

**[Sprite 資料體積]** → spriteData.ts 包含大量像素陣列，會增加 bundle size。Mitigation：動態 import，只在進入 Pixel Office 頁面時載入。

**[移植維護成本]** → 原版持續更新，fork 後會分岔。Mitigation：只取核心引擎，不追蹤上游更新；CC 特有邏輯清楚分離在 agentBridge 和 page 層。

**[WSL2 檔案系統]** → `/mnt/d/` 跨檔案系統存取較慢。Mitigation：JSONL 掃描走 `~/.claude/projects/`（Linux native fs），不走 Windows mount。
