## Why

Pixel Office 目前只能在 Dashboard 的 `/pixel-office` 頁面觀看。使用者日常在 VS Code、終端機等其他應用程式中工作時，無法同時看到 Agent 的活動狀態。使用者希望像 YouTube 子母畫面一樣，把辦公室場景彈出為 OS 層級的浮動視窗，蓋在任何應用程式上方，邊工作邊監控 Agent。

## What Changes

- 在 Pixel Office 頁面新增「彈出子母畫面」按鈕，使用 Document Picture-in-Picture API 將 Canvas 彈出為獨立浮動視窗
- 彈出的 PiP 視窗是 OS 層級的 always-on-top 視窗，可蓋在 VS Code、終端機等任何應用上
- PiP 視窗內持續渲染辦公室場景（角色動畫、日夜循環），以較低幀率運作
- 原始 Dashboard 頁面在 PiP 活躍時顯示「已彈出」狀態提示
- PiP 視窗關閉後自動回到正常的全頁面模式

## Capabilities

### New Capabilities
- `document-pip`: 使用 Document Picture-in-Picture API 將 Pixel Office Canvas 彈出為 OS 層級浮動視窗，包含啟動/停止控制和狀態管理

### Modified Capabilities
- `pixel-office-page`: 新增 PiP 按鈕、PiP 啟動邏輯、彈出狀態 UI

## Impact

- `dashboard/src/app/pixel-office/page.tsx`：新增 PiP 按鈕和彈出邏輯
- `dashboard/src/lib/pixel-office/`：新增 PiP 管理模組
- 瀏覽器相容性：Document PiP API 僅 Chrome 116+ / Edge 116+ 支援，需加入 feature detection 和 fallback 提示
- 不需要修改 layout.tsx 或其他頁面——PiP 完全由 Pixel Office 頁面管理
