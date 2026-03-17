## 1. 牆壁精靈載入

- [x] 1.1 從 OpenClaw-bot-review 取得 walls.png（64×128px），放入 `dashboard/public/assets/pixel-office/`
- [x] 1.2 建立 `scripts/import-walls.py` 轉碼腳本：讀取 walls.png → 提取 16 個 16×32 精靈 → 輸出 `dashboard/src/lib/pixel-office/sprites/wallSprites.ts`
- [x] 1.3 執行轉碼腳本生成 wallSprites.ts
- [x] 1.4 在 OfficeState 初始化時 import wallSprites 並呼叫 `setWallSprites()`，啟動 autotiling

## 2. 牆壁色彩調整

- [x] 2.1 在 `layoutSerializer.ts` 中將牆壁 tileColor 從 `null` 改為紫灰色調（`{ h: 240, s: 25, b: -10, c: 0 }`）
- [x] 2.2 驗證 renderer.ts 中牆壁精靈渲染路徑正確運作（`hasWallSprites()` → `getWallInstances()` → z-sorted render）

## 3. Agent Chip Bar 頁面佈局

- [x] 3.1 重寫 `page.tsx` 佈局：移除左側 192px sidebar，改為頂部水平 chip bar + 下方全幅 canvas
- [x] 3.2 重寫 AgentRow 元件為 AgentChip：水平排列，包含彩色狀態圓點 + Agent 名稱 + 大寫狀態標籤（WORKING/IDLE/OFFLINE）
- [x] 3.3 Chip bar 容器使用 `flex flex-wrap gap-2 overflow-x-auto`，背景半透明深色

## 4. 程式碼片段樣式改善

- [x] 4.1 修改 `renderer.ts` 中 `renderCodeSnippets()`：片段加深色背景 pill（`rgba(0,0,0,0.75)` 圓角矩形）
- [x] 4.2 片段文字顏色改為 `#4ade80`（綠色）monospace 字體，取代純白色

## 5. 驗證

- [x] 5.1 tsc 編譯通過
- [x] 5.2 在瀏覽器中目視確認：牆壁有精靈紋理、chip bar 在頂部、程式碼片段有綠色背景 pill
