## 1. 響應式導覽系統

- [x] 1.1 建立 `MobileDrawer` client component（`dashboard/src/components/MobileDrawer.tsx`）：漢堡按鈕、側邊抽屜、遮罩、導覽列表、Escape 關閉、路由變更自動關閉
- [x] 1.2 修改 `layout.tsx`：< md 顯示漢堡按鈕 + MobileDrawer，>= md 顯示原有水平導覽。加入 active route highlighting
- [x] 1.3 驗證：Chrome DevTools 行動模擬（375px iPhone SE），確認漢堡菜單開關、導覽、active 標示正常

## 2. 全域響應式基礎

- [x] 2.1 `globals.css` 加入觸控優化規則：`@media (pointer: coarse)` 設定 min-height/min-width 44px 給按鈕和連結
- [x] 2.2 統一所有頁面的容器間距：確保 `px-4` 在小螢幕、`sm:px-6 lg:px-8` 在大螢幕

## 3. 首頁（`/`）響應式

- [x] 3.1 Stats cards：改為 `grid-cols-2 sm:grid-cols-2 md:grid-cols-4`，確保小螢幕不會過擠
- [x] 3.2 底部雙欄（Deadlines + Tasks）：加入 `grid-cols-1 lg:grid-cols-2` 確保小螢幕單欄堆疊
- [x] 3.3 頁面標題列：flex wrap 處理，按鈕在小螢幕時堆疊至標題下方

## 4. ResponsiveTable 元件

- [x] 4.1 建立 `ResponsiveTable` 元件（`dashboard/src/components/ResponsiveTable.tsx`）：接受 columns 定義和 data，渲染 table（>= sm）+ cards（< sm）
- [x] 4.2 將 `TaskHistory.tsx` 改用 ResponsiveTable
- [x] 4.3 將工具監控頁（`agents/page.tsx`）的表格改用 ResponsiveTable
- [x] 4.4 將用量分析頁（`usage/page.tsx`）的 Session 表格改用 ResponsiveTable

## 5. 表單響應式

- [x] 5.1 `ScheduleForm.tsx`：所有 `grid-cols-2` 改為 `grid-cols-1 sm:grid-cols-2`
- [x] 5.2 `deadlines/page.tsx`：DeadlineForm 的 grid 同理處理
- [x] 5.3 其他頁面的 inline 表單（如記憶庫搜尋列）：確認 flex-wrap 正常

## 6. 各頁面微調

- [x] 6.1 專案列表頁（`projects/page.tsx`）：卡片 grid 確認 `grid-cols-1 sm:grid-cols-2`
- [x] 6.2 專案詳情頁（`projects/[id]/page.tsx`）：雙欄區塊加 `grid-cols-1 lg:grid-cols-2`，標題列 flex-wrap
- [x] 6.3 排程頁（`schedules/page.tsx`）：排程卡片列表在小螢幕單欄，狀態按鈕列 flex-wrap
- [x] 6.4 記憶庫頁（`memory/page.tsx`）：stats grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-5`，篩選器 flex-wrap
- [x] 6.5 用量分析頁（`usage/page.tsx`）：圖表標籤小螢幕旋轉 45°或減少 tick 數，stats grid 調整
- [x] 6.6 截止日頁、任務紀錄頁、使用指南頁：標題列 flex-wrap + 間距微調

## 7. 最終驗證

- [x] 7.1 Chrome DevTools 逐頁驗證：iPhone SE (375px)、iPhone 14 (390px)、iPad Mini (768px)
- [x] 7.2 確認桌面版（1280px+）外觀完全不變
- [x] 7.3 `next build` 通過，無 TypeScript 錯誤
