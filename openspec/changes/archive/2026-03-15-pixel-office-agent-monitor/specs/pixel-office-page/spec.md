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
頁面頂部 SHALL 顯示所有已註冊 Agent 的狀態 chip。

#### Scenario: Working Agent chip
- **WHEN** Agent 狀態為 working
- **THEN** chip SHALL 顯示 Agent 名稱 + 綠色脈衝動畫 + "working" 標籤

#### Scenario: Idle Agent chip
- **WHEN** Agent 狀態為 idle
- **THEN** chip SHALL 顯示 Agent 名稱 + 黃色脈衝動畫 + "idle" 標籤

#### Scenario: Offline Agent chip
- **WHEN** Agent 狀態為 offline
- **THEN** chip SHALL 顯示 Agent 名稱 + 灰色樣式 + "offline" 標籤

### Requirement: WebSocket 即時更新
頁面 SHALL 監聽 WebSocket 的 `agent:activity` 事件，即時更新動畫場景中的角色狀態。

#### Scenario: 收到狀態變更事件
- **WHEN** WebSocket 收到 `agent:activity` 事件，某 Agent 從 idle 變為 working
- **THEN** 對應角色 SHALL 在動畫中走向座位並切換為 TYPE 狀態，Chip Bar 同步更新

#### Scenario: WebSocket 斷線
- **WHEN** WebSocket 連線中斷
- **THEN** 頁面 SHALL 回退為每 30 秒輪詢 /api/agents/activity，並顯示連線斷開提示

### Requirement: Sidebar 導航入口
Dashboard 側邊列 SHALL 包含 Pixel Office 的導航連結。

#### Scenario: Sidebar 顯示
- **WHEN** Dashboard 載入
- **THEN** 側邊列 SHALL 顯示 Pixel Office 入口項目，包含像素風 icon 和文字標籤

#### Scenario: 當前頁面高亮
- **WHEN** 使用者在 /pixel-office 頁面
- **THEN** 側邊列的 Pixel Office 項目 SHALL 高亮顯示為 active 狀態
