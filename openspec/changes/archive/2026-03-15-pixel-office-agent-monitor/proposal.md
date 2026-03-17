## Why

Central Command Dashboard 目前只有表格/列表式的 Agent 狀態監控，缺乏直覺的即時視覺化。OpenClaw-bot-review 的 Pixel Office 功能提供了一個優秀的參考：用像素風辦公室動畫讓每個 Agent 化身為角色，在辦公室裡打字、走動、互動，一眼就能看出誰在忙、誰閒置、誰離線。將此概念移植到 Central Command，可以讓使用者用可愛且直覺的方式監督所有 Claude Code Agent 的執行狀態。

## What Changes

- **新增 Pixel Office 頁面**：在 Dashboard 新增 `/pixel-office` 路由，使用 Canvas 渲染像素風辦公室場景
- **移植並改造動畫引擎**：從 OpenClaw-bot-review 移植 Canvas 渲染器、Sprite 系統、角色 FSM（idle/walk/type 三態）、z-sort 深度遮擋、家具互動系統
- **替換資料來源**：原版讀取 `~/.openclaw/openclaw.json`，改為串接 Central Command 既有 API（`/api/agents`、`/api/tasks`、`/api/schedules`）以及 JSONL session 掃描
- **新增 Agent 活動偵測 API**：新增 `/api/agents/activity` 端點，掃描 `~/.claude/projects/` 下的 JSONL 檔案偵測 Agent 是否正在活動（最近 N 分鐘有新 message）
- **WebSocket 即時推送**：透過既有的 WS broadcaster 即時推送 Agent 狀態變更，讓動畫流暢反應
- **CC 專屬家具互動**：點擊白板顯示專案進度、點擊電腦顯示最近任務、點擊時鐘顯示排程狀態等
- **Sidebar 入口**：在現有導航列新增 Pixel Office 入口（像素風 icon）

## Capabilities

### New Capabilities
- `pixel-office-engine`: Canvas 像素動畫引擎（渲染器、Sprite 系統、角色 FSM、家具互動、z-sort 場景管理）
- `agent-activity-detection`: Agent 即時活動偵測（JSONL session 掃描 + WebSocket 推送）
- `pixel-office-page`: Dashboard 整合頁面（Agent chip bar、Canvas 場景、家具互動面板、側邊列入口）

### Modified Capabilities
（無既有 spec 需修改）

## Impact

- **Dashboard**：新增 `src/app/pixel-office/` 頁面及 `src/lib/pixel-office/` 引擎程式碼
- **Server**：新增 `/api/agents/activity` 路由，擴充 WS broadcaster 的 message type
- **依賴**：無新外部依賴（純 Canvas API + 現有 React/Tailwind）
- **效能**：Canvas requestAnimationFrame 迴圈需注意 CPU 使用，idle 時應降頻；JSONL 掃描需快取機制避免頻繁 I/O
- **現有功能**：不影響，Pixel Office 是純新增頁面
