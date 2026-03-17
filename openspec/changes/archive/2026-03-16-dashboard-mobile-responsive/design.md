## Context

Central Command Dashboard 使用 Next.js 16 + Tailwind CSS 4，目前有 11 個頁面路由。導覽列是水平 `flex gap-8` 排列 11 個 Link，在 < 768px 時直接溢出。頁面內多處使用 `grid-cols-2 md:grid-cols-4` 等斷點，但缺少 < 640px 的適配。表格只用 `overflow-x-auto` 處理，表單固定 2 欄。

使用者需要在手機上監看 Agent 狀態和排程進度，是「讀取為主、偶爾操作」的使用場景。

## Goals / Non-Goals

**Goals:**
- 所有頁面在 320px–768px 螢幕上可正常瀏覽和操作
- 導覽列在小螢幕有合理的收合/展開機制
- 桌面版外觀完全不變（純增量修改）
- 不引入新的外部依賴

**Non-Goals:**
- 不做 PWA / 離線支援（未來可選）
- 不重新設計桌面版 UI
- 不處理 pixel-office Canvas 的行動版（該頁面在手機上意義不大）
- 不做 native app

## Decisions

### 1. 導覽方案：漢堡菜單 + Drawer

**選擇**：< 768px 時隱藏水平導覽，顯示漢堡按鈕，點擊彈出全高側邊抽屜（左側滑入）。

**替代方案**：
- Bottom tab bar：項目太多（11 個），放不下
- 可捲動水平導覽：使用者不易發現隱藏項目
- Dropdown menu：行動端操作不流暢

**實作**：在 `layout.tsx` 新增 `MobileDrawer` client component，用 React state 控制開關，Tailwind `md:hidden` / `hidden md:flex` 切換。

### 2. 響應式斷點策略

**選擇**：統一使用 mobile-first 斷點：
- 預設（< 640px）：單欄堆疊
- `sm:` (640px)：2 欄 grid
- `md:` (768px)：導覽展開、3-4 欄 grid
- `lg:` (1024px)：完整桌面佈局

**理由**：Tailwind 預設就是 mobile-first，順著框架走最自然。

### 3. 表格行動版：響應式卡片

**選擇**：< 640px 時用 CSS 將 `<table>` 隱藏，改顯示卡片列表（同一份資料，兩套 markup）。

**替代方案**：
- 純 CSS 表格轉直式：CSS `display: block` trick，但語義混亂且樣式難控制
- 只用 `overflow-x-auto`：現狀，體驗差

**實作**：建立 `ResponsiveTable` wrapper component，接受 `columns` 和 `data`，自動渲染 table + mobile cards。

### 4. 表單適配：單欄堆疊

**選擇**：所有 `grid-cols-2` 的表單改為 `grid-cols-1 sm:grid-cols-2`。

**理由**：最小改動，效果明顯。不需要額外元件。

### 5. 觸控優化

**選擇**：在 `globals.css` 加入 `@media (pointer: coarse)` 規則，增大可點擊元素的最小尺寸至 44px。

**理由**：Apple HIG 和 Material Design 都建議 44px 最小觸控目標。

## Risks / Trade-offs

- **[兩套 markup]** → ResponsiveTable 會有 table + cards 兩份 DOM，增加些許 bundle 和 render 成本。但資料量小（通常 < 100 行），影響可忽略。
- **[圖表在小螢幕]** → Recharts 的 ResponsiveContainer 本身支援縮放，但標籤可能重疊。Mitigation：小螢幕時隱藏部分 tick labels 或旋轉角度。
- **[Drawer 無障礙]** → 需確保 Drawer 有 focus trap 和 Escape 關閉。Mitigation：實作時加入 aria 屬性和鍵盤事件。
- **[測試覆蓋]** → 無自動化 UI 測試。Mitigation：手動在 Chrome DevTools 行動模擬器中逐頁驗證。
