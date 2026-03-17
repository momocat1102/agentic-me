## Why

目前 Pixel Office 是從 OpenClaw-bot-review 移植過來的，但視覺風格與原版有明顯落差：牆壁是純色填充而非像素精靈、Agent 列表是左側直欄而非頂部 chip bar、整體畫面不夠精緻。需要回歸原版的美術風格，讓辦公室場景更好看。

## What Changes

- 將左側 Agent sidebar 改為頂部水平 chip bar（帶 emoji、名稱、狀態標籤）
- 引入 walls.png 精靈表 + bitmask autotiling 系統，取代純色牆壁填充
- 改善地板瓷磚渲染，使用原版的 HSL 調色方案
- 改善語音氣泡和程式碼片段的樣式，更接近原版深色背景 pill 風格
- 調整整體色彩調色板（牆壁紫灰 #3A3A5C、強調色天藍 #38bdf8）

## Capabilities

### New Capabilities

- `wall-autotiling`: 牆壁 bitmask autotiling 系統，使用 walls.png 精靈表根據相鄰牆壁自動選擇正確的牆壁變體

### Modified Capabilities

- `pixel-office-page`: Agent 列表從左側 sidebar 改為頂部水平 chip bar，整體頁面佈局變更
- `pixel-office-engine`: 牆壁渲染改用精靈表、色彩調色板調整、氣泡樣式改善

## Impact

- `dashboard/src/app/pixel-office/page.tsx` — 頁面佈局重構（sidebar → top bar）
- `dashboard/src/lib/pixel-office/engine/renderer.ts` — 牆壁渲染邏輯
- `dashboard/src/lib/pixel-office/wallTiles.ts` — 新增 PNG autotiling
- `dashboard/src/lib/pixel-office/constants.ts` — 色彩常數調整
- `dashboard/public/assets/pixel-office/` — 新增 walls.png 精靈表
- `dashboard/src/lib/pixel-office/sprites/tilesetSprites.ts` — 可能需要更新
