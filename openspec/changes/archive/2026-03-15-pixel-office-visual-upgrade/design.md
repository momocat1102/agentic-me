## Context

Pixel Office 從 OpenClaw-bot-review 移植而來，但視覺風格有明顯落差：

- **牆壁**：wallTiles.ts 已有完整的 bitmask autotiling 邏輯 + `setWallSprites()`，但從未被呼叫。目前 `hasWallSprites()` 永遠回傳 false，renderer 退化為 `wallColorToHex()` 純色填充。原因：缺少 walls.png 資源和 pngLoader。
- **Agent 列表**：左側 192px 垂直 sidebar，原版是頂部水平 chip bar（emoji + name + WORKING 標籤）
- **程式碼片段氣泡**：目前已有 `renderCodeSnippets()`，但樣式偏簡陋，原版有深色背景 pill + 綠色等亮色字體
- **整體色調**：牆壁色彩過於平淡，缺少原版的紫灰 #3A3A5C 質感

## Goals / Non-Goals

**Goals:**
- 啟動牆壁 autotiling：從 OpenClaw 取得 walls.png，寫 pngLoader 解析並呼叫 setWallSprites
- Agent 列表從左側 sidebar 改為頂部水平 chip bar
- 程式碼片段氣泡改為深色背景 pill + 綠色 monospace 字體
- 牆壁色彩調整為紫灰色調

**Non-Goals:**
- 不更換角色精靈（目前的 spriteData.ts 已夠用）
- 不重構整個渲染引擎
- 不做響應式佈局（保持桌面優先）
- 不加入深色/淺色主題切換

## Decisions

### 1. 牆壁精靈載入方式：靜態導入 vs 動態 PNG 載入

**選擇：靜態導入（與 tilesetSprites.ts 相同方式）**

用 `scripts/import-tileset.ts` 類似的腳本把 walls.png 轉成 TypeScript hex 陣列，直接打包進 bundle。

理由：
- 與現有 tilesetSprites.ts 模式一致
- 不需處理非同步載入和載入失敗
- walls.png 只有 1.7KB（16 個 16×32 精靈），轉成 TS 也很小

替代方案（動態 PNG 載入）：需要 canvas 離屏渲染解析像素，增加複雜度。

### 2. Agent chip bar 位置：頂部 vs 底部

**選擇：頂部水平 chip bar**

理由：與原版一致，不遮擋辦公室主畫面。使用水平滾動 `overflow-x-auto` 處理多 agent 情況。

### 3. 程式碼片段樣式

**選擇：深色半透明背景 pill + 亮色 monospace 字體**

現有 `renderCodeSnippets()` 已有文字陰影，改為先畫 `rgba(0,0,0,0.75)` 圓角背景，再用 `#4ade80`（綠色）或 `#FFD700`（金色）文字。

## Risks / Trade-offs

- [Risk] walls.png 轉碼可能色差 → 用原版 walls.png 逐像素提取，手動驗證
- [Risk] Chip bar 遮擋上方牆壁裝飾 → Canvas 區域往下推，留出 chip bar 空間
- [Risk] 程式碼片段改 Canvas 渲染後可能與現有氣泡重疊 → 調整 floatY 偏移
