## Context

Pixel Office 目前使用混合式 sprite 系統：手寫 SpriteData（16×24 hex 陣列）用於人類 Agent 角色，LPC PNG sprite sheet（32×32）用於寵物貓。渲染管線支援兩條路徑：`getCachedSprite()` 將 SpriteData 轉 canvas，以及 `ctx.drawImage()` 直接裁切 PNG sheet。

兩個素材包的角色分工：
- **Neko Cafe Asset Pack**（HelloRumin）：16×16 貓 NPC 作為 **Agent 外觀** + tileset + 家具 + 甜點
- **32×32 Pixel Kittens**（Last tick）：32×32 animated cats 作為**辦公室寵物貓**

## Goals / Non-Goals

**Goals:**
- 用 Neko Cafe 16×16 貓 NPC 取代人類 Agent sprite，讓所有 Agent 變成可愛的貓咪形象
- 用外部 PNG tileset 取代手寫 SpriteData 地板/牆壁
- 引入 Neko Cafe 家具 sprite，營造咖啡廳氛圍
- 用 Last tick 32×32 animated kittens 取代現有 LPC cats 作為寵物貓
- 重新設計辦公室佈局為 Neko Cafe 風格

**Non-Goals:**
- 不實作 tileset editor 或使用者自訂佈局功能
- 不更動 Agent 系統邏輯（ccBridge、活動狀態同步）
- 不支援動態素材包切換（reskin 是一次性替換）
- 不修改 canvas 引擎核心架構（zoom、pan、z-sorting 等）

## Decisions

### 1. Agent 外觀：Neko Cafe 16×16 貓 NPC 取代 16×24 人類角色

**選擇：用 PNG drawImage 裁切 Neko Cafe 貓 NPC sprite sheet**

理由：
- 現有 Agent 是 16×24 SpriteData 人類角色（436KB characterSprites.ts），維護成本高
- Neko Cafe 有 3 隻貓 NPC（walk + idle 動畫），風格統一
- 16×16 比 16×24 小，但 zoom=3 下渲染到 48×48 仍清晰

做法：
- 新增 `agentCatSheet.ts`：載入 Neko Cafe 貓 NPC sprite sheet，提供 `getAgentCatFrame(ch)` 方法
- 3 隻貓 NPC 對應到 Agent palette（palette 0/1/2 = 貓 1/2/3）
- `renderer.ts` 優先用 PNG sheet 渲染 Agent，fallback 到 SpriteData
- walk → 對應 Agent WALK 狀態，idle → 對應 Agent TYPE/IDLE 狀態
- 尺寸差異處理：renderSize 從 16×24 改為 16×16，調整 drawY 錨點

### 2. 寵物貓：Last tick 32×32 取代 LPC cats

**選擇：修改現有 catSpriteSheet.ts，換用 Last tick sprite sheet**

理由：
- 已有 PNG sheet 渲染路徑（getCatSheetFrame + drawImage）
- Last tick 32×32 與現有 LPC 32×32 尺寸相容
- 動畫更豐富（48 種 + 31 idle）

做法：修改 `catSpriteSheet.ts` 的 frame mapping，換用 Last tick PNG。

### 3. PNG tileset 渲染方式：drawImage 裁切 vs 轉換為 SpriteData

**選擇：drawImage 直接裁切 PNG tileset**

理由：
- 素材已是 PNG，轉換為 SpriteData 需要離線腳本且會遺失抗鋸齒
- 現有 renderer 已有 drawImage 路徑（貓咪 sprite sheet），擴展自然
- 效能更好：避免逐像素 hex→fillRect

做法：新增 `TilesetManager` 類別，載入 tileset PNG 並提供 `drawTile(ctx, tileId, x, y)` 方法。

### 4. 家具 sprite 整合方式

**選擇：混合模式——新家具用 PNG tileset，舊家具保留 SpriteData**

理由：
- Neko Cafe 家具 sprite 在 tileset PNG 中，直接裁切最有效率
- 現有部分辦公設備（電腦、server rack）可保留
- furnitureCatalog 新增 `spriteSource` 欄位區分 'spriteData' | 'tileset'

### 5. 佈局：全新佈局

**選擇：重寫 `createDefaultLayout()`**

理由：咖啡廳佈局與辦公室差異太大，地圖大小維持 21×17 不變。

## Risks / Trade-offs

- **Agent 尺寸變化**：16×16 貓 vs 原本 16×24 人類，可能影響名牌位置、點擊區域、座位偏移。→ 緩解：調整 CHARACTER_SITTING_OFFSET_PX 和名牌 Y 位置
- **3 隻貓 NPC 需覆蓋所有 Agent**：只有 3 種外觀，超過 3 個 Agent 時需重複。→ 緩解：可用色相偏移（hue shift on canvas）創造更多變化，或接受重複
- **素材下載依賴**：使用者需手動從 itch.io 下載。→ 緩解：加入素材缺失偵測，顯示 fallback 提示
- **Neko Cafe sprite sheet 格式未知**：需下載後分析 grid layout。→ 緩解：先建好介面，下載後填入座標
- **Last tick sprite sheet 格式未知**：同上。→ 緩解：先建好 frame mapping 介面
