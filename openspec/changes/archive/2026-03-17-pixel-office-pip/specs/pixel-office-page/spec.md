## MODIFIED Requirements

### Requirement: Pixel Office 路由與頁面
Dashboard SHALL 在 `/pixel-office` 路徑提供 Pixel Office 頁面，整合 Canvas 動畫引擎與 Agent 活動資料。頁面 SHALL 新增子母畫面功能，允許將 Canvas 彈出為 OS 層級浮動視窗。

#### Scenario: 頁面載入
- **WHEN** 使用者導航到 /pixel-office
- **THEN** 頁面 SHALL 顯示 Agent Chip Bar（頂部）和 Canvas 辦公室場景（主區域），並從 /api/agents/activity 取得初始狀態。控制區域 SHALL 包含「子母畫面」按鈕。

#### Scenario: 動態 import 引擎
- **WHEN** 頁面首次載入
- **THEN** Sprite 資料和引擎模組 SHALL 透過 dynamic import 載入，不影響其他頁面的 bundle size

#### Scenario: Canvas 彈出至 PiP 後的頁面狀態
- **WHEN** Canvas 已彈出至 PiP 視窗
- **THEN** 頁面 Canvas 區域 SHALL 顯示佔位提示（「已彈出至子母畫面」+ 收回按鈕），Agent Chip Bar 和編輯按鈕 SHALL 隱藏或 disabled
