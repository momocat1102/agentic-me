## 1. 基礎架構

- [x] 1.1 建立 `src/lib/pixel-office/editor/` 模組：EditorState class（mode toggle、selected furniture、drag state）
- [x] 1.2 在 `page.tsx` 加入編輯模式 toggle 按鈕（右上角），切換時更新 EditorState
- [x] 1.3 編輯模式下在 Canvas 繪製半透明 tile 格線（renderer.ts 擴充）

## 2. 傢俱目錄面板

- [x] 2.1 建立 FurniturePalette React component：從 furnitureCatalog 讀取傢俱，按 category 分組顯示
- [x] 2.2 每個傢俱項目顯示小預覽（tileset crop 或 emoji）和名稱
- [x] 2.3 點擊傢俱項目 → 進入 placement 模式，設定 EditorState.placingType

## 3. 傢俱放置（Placement）

- [x] 3.1 placement 模式下，mousemove 時計算 grid-snapped tile 座標，繪製半透明傢俱預覽
- [x] 3.2 碰撞偵測：檢查 footprint 是否與現有傢俱重疊，重疊時預覽變紅
- [x] 3.3 click 時若無碰撞，建立新的 PlacedFurniture 加入 layout.furniture 陣列
- [x] 3.4 支援 canPlaceOnWalls 傢俱放在牆面 tile 上

## 4. 傢俱選取與移動

- [x] 4.1 點擊已放置傢俱 → 選取（高亮邊框），設定 EditorState.selectedUid
- [x] 4.2 拖拉已選取傢俱 → 移動到新位置（grid snap + 碰撞偵測）
- [x] 4.3 Delete / Backspace 鍵 → 刪除選取的傢俱

## 5. 佈局持久化

- [x] 5.1 每次傢俱變動後自動存 layout JSON 到 localStorage（key: pixel-office-layout）
- [x] 5.2 頁面載入時從 localStorage 讀取佈局，有則使用，無則 fallback 到 createDefaultLayout()
- [x] 5.3 匯出按鈕：下載 layout JSON 檔案
- [x] 5.4 匯入按鈕：file input 讀取 JSON 並載入
- [x] 5.5 重置按鈕：清除 localStorage，恢復預設佈局（需確認 dialog）

## 6. 整合與收尾

- [x] 6.1 編輯模式下工具列 UI（匯出/匯入/重置/完成按鈕）
- [x] 6.2 確保一般模式下所有編輯 mouse events 不干擾（完全隔離）
- [x] 6.3 Build 驗證 + 截圖測試
