## 1. Server - Agent 活動偵測 API

- [x] 1.1 建立 `server/src/services/agent-activity.ts`：掃描 `~/.claude/projects/` 下 JSONL 檔案，解析最後 message 時間戳，判斷各 Agent 活動狀態（working/idle/offline），含 30 秒記憶體快取
- [x] 1.2 在 `server/src/routes/agents.ts` 新增 `GET /api/agents/activity` 端點，回傳 `[{ agentId, agentName, status, lastActiveAt, currentProject, currentSessionId }]`
- [x] 1.3 擴充 `server/src/types/index.ts` 新增 `AgentActivity` 型別和 `agent:activity` WSMessageType
- [x] 1.4 在 server 主迴圈加入 30 秒定時掃描，狀態變更時透過 WS broadcaster 推送 `agent:activity` 事件

## 2. 移植 Pixel Office 引擎

- [x] 2.1 從 OpenClaw-bot-review 移植核心引擎到 `dashboard/src/lib/pixel-office/`：types.ts、constants.ts、engine/renderer.ts、engine/characters.ts、engine/gameLoop.ts、engine/officeState.ts
- [x] 2.2 移植 Sprite 系統：sprites/spriteData.ts、sprites/spriteCache.ts、colorize.ts
- [x] 2.3 移植佈局系統：layout/tileMap.ts（BFS 尋路 + 可走格判斷）
- [x] 2.4 改造 agentBridge.ts：替換 OpenClaw API 呼叫為 CC `/api/agents/activity` + WebSocket 監聯 `agent:activity` 事件
- [x] 2.5 移除 OpenClaw 特有功能（Gateway SRE 角色、platform test、龍蝦系統），保留核心辦公室場景

## 3. Dashboard - Pixel Office 頁面

- [x] 3.1 建立 `dashboard/src/app/pixel-office/page.tsx`：整合 Canvas 引擎、Agent Chip Bar、家具互動面板
- [x] 3.2 實作 Agent Chip Bar 元件：顯示各 Agent 狀態（working=綠色脈衝、idle=黃色、offline=灰色）
- [x] 3.3 實作家具互動 popover：白板→專案進度（/api/projects）、電腦→最近任務（/api/tasks）、時鐘→排程（/api/schedules）、Server→系統健康（/api/health）
- [x] 3.4 實作 WebSocket 監聽：連線時即時更新動畫，斷線時回退為 30 秒輪詢 + 斷線提示
- [x] 3.5 動態 import Sprite 資料和引擎模組，避免影響其他頁面 bundle size

## 4. Dashboard - 導航整合

- [x] 4.1 在 sidebar/layout 的導航列新增 Pixel Office 入口（像素風 icon + 文字標籤 + active 高亮）

## 5. 效能與收尾

- [x] 5.1 實作頁面不在前台時暫停 requestAnimationFrame（document.visibilitychange）
- [x] 5.2 JSONL 掃描只處理最近 24 小時的檔案（按 mtime 過濾），避免掃描歷史檔案
- [x] 5.3 端到端測試：啟動 server + dashboard，驗證 Agent 狀態正確反映在 Pixel Office 動畫中
