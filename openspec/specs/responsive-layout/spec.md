## ADDED Requirements

### Requirement: Single-column stacking below 640px
所有使用 grid 佈局的頁面區塊，SHALL 在螢幕寬度 < 640px 時自動堆疊為單欄。

#### Scenario: Stats cards on mobile
- **WHEN** 螢幕寬度 < 640px
- **THEN** Stats cards SHALL 以單欄或兩欄顯示，每張卡片寬度佔滿容器

#### Scenario: Two-column sections on mobile
- **WHEN** 頁面有雙欄佈局（如首頁的 Deadlines + Tasks）且螢幕 < 640px
- **THEN** 兩個區塊 SHALL 垂直堆疊為單欄

### Requirement: Responsive table to cards
表格元件（TaskHistory、工具使用表格、Session 列表）SHALL 在 < 640px 時以卡片形式呈現同一份資料。

#### Scenario: Task history on mobile
- **WHEN** 螢幕寬度 < 640px
- **THEN** 任務紀錄 SHALL 以卡片列表顯示，每張卡片包含任務的關鍵欄位（Agent、摘要、時間、狀態）

#### Scenario: Table on desktop
- **WHEN** 螢幕寬度 >= 640px
- **THEN** 資料 SHALL 以傳統表格格式顯示

### Requirement: Form single-column on mobile
所有多欄表單（如 ScheduleForm、DeadlineForm）SHALL 在 < 640px 時改為單欄堆疊。

#### Scenario: Schedule form on mobile
- **WHEN** 螢幕寬度 < 640px 且使用者開啟排程表單
- **THEN** 表單欄位 SHALL 以單欄垂直排列，每個欄位寬度佔滿容器

### Requirement: Touch-friendly tap targets
在觸控裝置上，所有可互動元素（按鈕、連結、切換開關）SHALL 有至少 44px × 44px 的觸控區域。

#### Scenario: Button size on touch device
- **WHEN** 使用者以觸控方式操作（`pointer: coarse`）
- **THEN** 按鈕和連結的最小觸控區域 SHALL >= 44px × 44px

### Requirement: Chart readability on small screens
Recharts 圖表元件 SHALL 在小螢幕上保持可讀性。

#### Scenario: Bar chart labels on mobile
- **WHEN** 螢幕寬度 < 640px 且頁面含有長軸標籤的圖表
- **THEN** 圖表 SHALL 調整標籤（旋轉、縮寫或減少 tick 數量）以避免重疊

### Requirement: Header layout adaptation
頁面標題列（標題 + 操作按鈕的 flex 橫排）SHALL 在小螢幕時適當換行或堆疊。

#### Scenario: Page header with action buttons on mobile
- **WHEN** 螢幕寬度 < 640px 且頁面標題列含有操作按鈕
- **THEN** 標題和按鈕 SHALL 垂直堆疊，按鈕區域 SHALL 在標題下方
