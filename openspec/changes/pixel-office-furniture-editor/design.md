## Context

Pixel Office 是 Central Command Dashboard 上的像素風辦公室視覺化頁面。目前傢俱佈局硬寫在 `layoutSerializer.ts` 的 `createDefaultLayout()` 裡，每次調整位置都要改程式碼 → build → reload。使用者希望能直接在畫面上拖拉傢俱。

現有基礎設施：
- Canvas 渲染引擎（`renderer.ts`）已支援 tileset 和 emoji 傢俱渲染
- `furnitureCatalog.ts` 有完整的傢俱目錄（含 footprint、sprite source）
- `types.ts` 已定義 `EditTool` enum（TILE_PAINT, FURNITURE_PLACE, SELECT 等）
- Viewport 支援 Ctrl+wheel zoom 和 Ctrl+drag pan

## Goals / Non-Goals

**Goals:**
- 使用者可在 pixel office 頁面上以視覺化方式佈置傢俱
- 支援：從目錄拖入、選取移動、刪除已放置的傢俱
- 修改後的佈局可以持久化（不會每次 reload 消失）
- 牆面裝飾可以正確放在牆上

**Non-Goals:**
- 不做 tile paint / wall paint 功能（現有 EditTool 中定義了但不在此次實作範圍）
- 不做多人協作編輯
- 不做 undo/redo（第一版）
- 不改 server-side API（純前端功能）

## Decisions

### 1. 編輯模式架構：獨立 EditorState + toggle

**選擇**：新增 `EditorState` class 管理編輯狀態，透過 toggle 按鈕切換編輯模式。

**替代方案**：直接在 page.tsx 加 state — 太亂，page.tsx 已經很大。

**理由**：獨立模組好維護，且未來可擴展 tile paint 等功能。

### 2. 傢俱拖拉機制：Canvas mouse events + grid snap

**選擇**：在 Canvas 上攔截 mousedown/mousemove/mouseup，搭配 grid snap（吸附到 tile 格線）。

**替代方案**：用 HTML overlay divs 做拖拉 — 無法正確對齊 pixel 座標系統。

**理由**：所有渲染都在 Canvas 上，必須用 Canvas 座標系統。Grid snap 確保傢俱對齊格線。

### 3. 佈局持久化：localStorage + JSON 匯出

**選擇**：
- 即時存到 `localStorage`（key: `pixel-office-layout`）
- 提供 Export JSON / Import JSON 按鈕

**替代方案**：存到 server API — over-engineering，純裝飾功能不需要。

**理由**：快速、無需 server 支援。匯出 JSON 可以手動貼回 layoutSerializer.ts 作為新預設。

### 4. 傢俱面板 UI：側邊欄分類列表

**選擇**：在右側（或現有 Agent 列表下方）顯示傢俱目錄面板，按 category 分組，點選後進入 placement 模式。

**替代方案**：浮動工具列 — 會擋住畫面。

**理由**：現有左側欄已有 Agent list，傢俱面板可以在編輯模式時取代或疊加。

### 5. 碰撞偵測：簡單 footprint overlap 檢查

**選擇**：放置時檢查 footprint 是否與現有傢俱重疊，重疊時顯示紅色預覽。

**理由**：避免傢俱堆疊，保持佈局整潔。

## Risks / Trade-offs

- **[Canvas 事件衝突]** → 編輯模式下攔截所有 mouse events，一般模式下完全不干擾。用 mode toggle 隔離。
- **[效能]** → 每次 mousemove 重新渲染拖拉預覽可能掉幀 → 只渲染 ghost overlay，不重繪整個場景。
- **[localStorage 限制]** → 佈局 JSON 很小（~5KB），不會有問題。
- **[向下相容]** → 如果 localStorage 沒有存檔，fallback 到 `createDefaultLayout()`，零影響。
