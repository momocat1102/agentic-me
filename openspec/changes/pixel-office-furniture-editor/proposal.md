## Why

目前 pixel office 的傢俱佈局只能透過修改 `layoutSerializer.ts` 的程式碼來調整位置，需要手動輸入 col/row 座標、rebuild、重新載入才能看到效果。這個流程極其低效且抽象，無法直覺地看到佈局結果。需要一個視覺化的互動編輯器，讓使用者可以直接在畫面上拖拉傢俱來佈置辦公室。

## What Changes

- 新增傢俱拖拉放置功能：從傢俱目錄選擇物件，放到地圖上
- 新增傢俱選取與移動功能：點選已放置的傢俱，拖拉到新位置
- 新增傢俱刪除功能：選取後可刪除
- 新增佈局儲存/匯出功能：將修改後的佈局序列化為 JSON，可存回 layoutSerializer 或 localStorage
- 新增編輯模式切換：一般模式 ↔ 編輯模式（避免誤觸）
- 支援牆面裝飾放置：可將 `canPlaceOnWalls` 物件放在牆面上（解決牆面太短的問題也順便處理）

## Capabilities

### New Capabilities
- `furniture-drag-drop`: 傢俱拖拉放置核心互動（選取、拖拉、放置、刪除、碰撞偵測）
- `layout-persistence`: 佈局持久化（儲存到 localStorage、匯出/匯入 JSON）
- `editor-ui`: 編輯模式 UI（傢俱面板、工具列、模式切換按鈕）

### Modified Capabilities
（無既有 spec 需要修改）

## Impact

- **前端**：`page.tsx`（新增編輯模式事件處理）、`renderer.ts`（選取高亮、拖拉預覽渲染）、`layoutSerializer.ts`（匯出功能）
- **型別**：`types.ts`（可能需要擴充 EditTool、PlacedFurniture）
- **新檔案**：`editor/` 模組（EditorState、drag handler、furniture panel component）
- **依賴**：無新依賴，純 Canvas + React 實作
