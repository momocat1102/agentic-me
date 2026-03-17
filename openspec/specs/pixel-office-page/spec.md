## ADDED Requirements

### Requirement: Pixel Office 路由與頁面
Dashboard SHALL 在 `/pixel-office` 路徑提供 Pixel Office 頁面，整合 Canvas 動畫引擎與 Agent 活動資料。

#### Scenario: 頁面載入
- **WHEN** 使用者導航到 /pixel-office
- **THEN** 頁面 SHALL 顯示 Agent Chip Bar（頂部）和 Canvas 辦公室場景（主區域），並從 /api/agents/activity 取得初始狀態

#### Scenario: 動態 import 引擎
- **WHEN** 頁面首次載入
- **THEN** Sprite 資料和引擎模組 SHALL 透過 dynamic import 載入，不影響其他頁面的 bundle size

### Requirement: Agent Chip Bar
頁面頂部 SHALL 顯示所有已註冊 Agent 的狀態 chip，以水平 `flex-wrap` 排列。每個 chip SHALL 包含彩色狀態圓點、Agent 名稱、以及大寫狀態標籤文字（WORKING / IDLE / OFFLINE）。

#### Scenario: Working Agent chip
- **WHEN** Agent 狀態為 working
- **THEN** chip SHALL 顯示綠色圓點（帶脈衝動畫）+ Agent 名稱 + "WORKING" 標籤，背景為半透明深色

#### Scenario: Idle Agent chip
- **WHEN** Agent 狀態為 idle
- **THEN** chip SHALL 顯示黃色圓點 + Agent 名稱 + "IDLE" 標籤

#### Scenario: Offline Agent chip
- **WHEN** Agent 狀態為 offline
- **THEN** chip SHALL 顯示灰色圓點 + Agent 名稱 + "OFFLINE" 標籤，文字色灰暗

#### Scenario: Chip bar 水平滾動
- **WHEN** Agent 數量超過一行容量
- **THEN** chip bar SHALL 啟用水平滾動（`overflow-x-auto`），高度固定不變

### Requirement: WebSocket 即時更新
頁面 SHALL 監聽 WebSocket 的 `agent:activity` 事件，即時更新動畫場景中的角色狀態。

#### Scenario: 收到狀態變更事件
- **WHEN** WebSocket 收到 `agent:activity` 事件，某 Agent 從 idle 變為 working
- **THEN** 對應角色 SHALL 在動畫中走向座位並切換為 TYPE 狀態，Chip Bar 同步更新

#### Scenario: WebSocket 斷線
- **WHEN** WebSocket 連線中斷
- **THEN** 頁面 SHALL 回退為每 30 秒輪詢 /api/agents/activity，並顯示連線斷開提示

### Requirement: 頁面佈局
頁面 SHALL 採用垂直佈局：頂部 Agent Chip Bar + 下方全幅 Canvas。移除左側 sidebar 佈局。

#### Scenario: Canvas 佔滿剩餘空間
- **WHEN** 頁面載入完成
- **THEN** Canvas 區域 SHALL 佔滿 chip bar 以下的所有可用空間（`flex-1`）
