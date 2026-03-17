## MODIFIED Requirements

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

### Requirement: 頁面佈局
頁面 SHALL 採用垂直佈局：頂部 Agent Chip Bar + 下方全幅 Canvas。移除左側 sidebar 佈局。

#### Scenario: Canvas 佔滿剩餘空間
- **WHEN** 頁面載入完成
- **THEN** Canvas 區域 SHALL 佔滿 chip bar 以下的所有可用空間（`flex-1`）
