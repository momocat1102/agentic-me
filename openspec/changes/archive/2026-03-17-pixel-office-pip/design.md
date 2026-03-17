## Context

Pixel Office 是一個跑在 Dashboard 內的像素風辦公室場景，用 Canvas 2D 渲染角色動畫、家具、日夜循環等。使用者希望在 VS Code、終端機等其他應用程式中工作時，也能以小視窗看到辦公室場景。

瀏覽器提供 Document Picture-in-Picture API（Chrome 116+），可以將任意 DOM 元素彈出為 OS 層級的 always-on-top 浮動視窗。這正是我們需要的。

## Goals / Non-Goals

**Goals:**
- 在 Pixel Office 頁面提供「彈出子母畫面」按鈕
- 點擊後將 Canvas 彈出為 OS 層級浮動視窗，always-on-top
- PiP 視窗持續渲染辦公室場景（角色、家具、日夜循環）
- PiP 視窗可由使用者調整大小和位置（OS 原生行為）
- PiP 關閉後回到正常全頁面模式
- 不支援的瀏覽器顯示提示訊息

**Non-Goals:**
- PiP 內不支援編輯模式（家具放置/拖曳）
- PiP 內不支援家具互動彈窗
- PiP 內不支援 Agent Chip Bar
- 不做 CSS overlay 方案（不符合跨應用需求）
- 不做 Electron/Tauri 包裝

## Decisions

### 1. 使用 Document Picture-in-Picture API

**選擇**：使用 `documentPictureInPicture.requestWindow()` 將 Canvas 容器移入 PiP 視窗。

**替代方案**：
- Video PiP API（`<video>.requestPictureInPicture()`）→ 需要先用 `captureStream()` 將 Canvas 轉為 video stream，多一層轉換開銷且畫質受限
- CSS `position: fixed` overlay → 只能在 Dashboard 內浮動，切到 VS Code 就看不到
- Electron wrapper → 過度工程

**理由**：Document PiP 是最直接的方案，可以直接把 Canvas 元素移到 PiP 視窗中，無需轉換。渲染邏輯完全不變，只是 Canvas 在不同的 window 中。

### 2. Canvas 移動策略

**選擇**：彈出 PiP 時，將現有的 Canvas 元素用 `pipWindow.document.body.appendChild(canvas)` 移入 PiP 視窗。PiP 關閉時再移回原頁面。

**為什麼不建立第二個 Canvas**：
- 避免維護兩份渲染邏輯
- OfficeState 和遊戲迴圈完全不需要改動
- Canvas 移動後 rendering context 保持有效

**注意**：移動 Canvas 時需要暫停一幀、重新取得 context。

### 3. PiP 視窗尺寸

- 預設請求尺寸：`width: 400, height: 300`（Document PiP API 參數）
- 使用者可以用 OS 的視窗拖曳自由調整大小
- Canvas 內部監聽 resize 事件，動態調整 Canvas 實際像素尺寸

### 4. 遊戲迴圈處理

- PiP 彈出時：遊戲迴圈繼續跑在原始頁面的 `requestAnimationFrame` 中
- Canvas 被移到 PiP 視窗後，RAF 仍然有效（Canvas 的 rendering context 不受 DOM tree 影響）
- 幀率維持不變（不需要降幀，因為 Canvas 尺寸較小，GPU 負擔本來就低）

### 5. PiP 生命週期

```
使用者點擊「子母畫面」按鈕
  → feature detect: documentPictureInPicture 存在？
  → requestWindow({ width: 400, height: 300 })
  → 注入必要的 CSS（背景色、margin 歸零）
  → 將 Canvas 元素 appendChild 到 pipWindow.document.body
  → 原始頁面顯示「已彈出至子母畫面」狀態
  → 監聽 pipWindow 'pagehide' 事件（使用者關閉 PiP）
  → 關閉時：將 Canvas 移回原始頁面容器
```

### 6. 瀏覽器相容性

| 瀏覽器 | 支援 |
|--------|------|
| Chrome 116+ | ✅ |
| Edge 116+ | ✅ |
| Firefox | ❌（尚未支援） |
| Safari | ❌（尚未支援） |

不支援時：按鈕 disabled + tooltip 提示「此功能需要 Chrome 116+ 或 Edge 116+」。

## Risks / Trade-offs

- **[瀏覽器相容性]** 僅 Chromium 系列支援 → 使用者用的是 Chrome-based 的 VS Code 配合 Chrome 瀏覽 Dashboard，影響不大
- **[Canvas 移動]** 移動 Canvas DOM 節點可能造成一幀閃爍 → 移動前暫停渲染，移動後恢復
- **[頁面關閉]** 使用者關閉 Dashboard 分頁 → PiP 視窗也會自動關閉（瀏覽器行為）
- **[事件監聽]** Canvas 上的 click/mouse 事件在 PiP 視窗中仍有效 → 但我們在 PiP 中不需要互動，可以忽略
