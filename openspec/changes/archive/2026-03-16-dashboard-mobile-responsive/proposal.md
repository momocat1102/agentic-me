## Why

Central Command Dashboard 目前是桌面優先設計，在手機瀏覽器（< 768px）上有嚴重的可用性問題：導覽列 11 個項目溢出、表格無法閱讀、表單欄位擠壓。使用者需要在手機上隨時監看 Agent 狀態、任務進度和排程執行情況，因此需要全面的行動裝置適配。

## What Changes

- 導覽列改為響應式：小螢幕使用漢堡菜單 + 側邊抽屜（drawer），大螢幕維持水平導覽
- 全頁面 grid 斷點統一：確保所有頁面在 < 768px 時正確堆疊為單欄
- 表格元件行動版：小螢幕自動切換為卡片式呈現（TaskHistory、工具監控表格、Session 列表等）
- 表單響應式：ScheduleForm 等複雜表單在小螢幕改為單欄堆疊
- 觸控友善調整：按鈕最小 44px 觸控區域、適當間距
- 圖表元件適配：確保 Recharts 圖表在小螢幕可讀（標籤縮寫、適當縮放）

## Capabilities

### New Capabilities
- `mobile-navigation`: 響應式導覽系統，包含漢堡菜單、側邊抽屜、自動收合邏輯
- `responsive-layout`: 全頁面統一的響應式佈局策略，涵蓋 grid 斷點、容器間距、堆疊規則

### Modified Capabilities
（無現有 spec 需要修改——這是純 UI 層的增強，不影響現有功能的行為規格）

## Impact

- **程式碼**：`dashboard/src/app/layout.tsx`（導覽重構）、所有 `page.tsx`（grid 斷點調整）、`TaskHistory.tsx`、`ScheduleForm.tsx` 等元件
- **依賴**：無新增外部依賴，純 Tailwind CSS 響應式 utilities
- **API**：無影響
- **相容性**：桌面版外觀與行為不變，僅增加小螢幕適配
