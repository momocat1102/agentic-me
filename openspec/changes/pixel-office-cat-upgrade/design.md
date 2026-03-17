## Context

Pixel Office 是一個像素風辦公室場景，用於監視 Agent 活動狀態。目前有龍蝦寵物系統（兩隻：main lobster + hunter lobster），使用 `updateCat()` 函數做漫步行為。側邊欄 Agent 列表無排序。

現有貓咪基礎設施：
- `catSprites.ts` 已有基本貓咪 sprite（4 方向 walk）
- `characters.ts` 已有 `updateCat()` 函數和 `isCat` 判斷
- 龍蝦實際上共用貓咪的移動邏輯

## Goals / Non-Goals

**Goals:**
- Agent 列表按 working > idle > offline 排序，同狀態內按名稱排序
- 移除龍蝦系統（spawn、rage、bubble、hunter）
- 用貓咪取代龍蝦，保留並擴充現有 cat 行為
- 增加貓咪行為多樣性（sleep、sit idle）
- 支援 1-3 隻辦公室貓咪

**Non-Goals:**
- 不做貓咪互動 UI（點擊觸發特效等）
- 不改變辦公室佈局或家具
- 不新增外部 PNG 素材載入管線（用現有 SpriteData 2D array 格式）
- 不做貓咪自定義（顏色選擇等）

## Decisions

### 1. Agent 排序策略
**選擇**：在 `page.tsx` 的 `activities` 渲染前加 `.sort()`，排序鍵為 status priority（working=0, idle=1, offline=2），次鍵為 agent name。

**理由**：最小改動，不影響 ccBridge 的資料結構。排序在 render 層做，不污染狀態管理。

### 2. 貓咪 Sprite 來源
**選擇**：手工編碼 SpriteData（擴充現有 `catSprites.ts`），參考外部素材風格但不直接載入 PNG。

**替代方案**：載入外部 PNG sprite sheet → 需要新增 image loader 管線，過度工程。

**理由**：現有系統全部用 `SpriteData`（2D pixel array），保持一致性。目前 catSprites.ts 已有 walk 動畫，只需新增 idle/sleep 變體。

### 3. 龍蝦移除範圍
**選擇**：完全移除，包括：
- `officeState.ts`：`spawnLobster()`、`spawnHunterLobster()`、`toggleFirstLobsterRage()`、`getFirstLobsterAt()`、lobster bubble 更新
- `characters.ts`：`isLobster` 分支、rage speed factor
- `types.ts`：`isLobster`、`lobsterRageTimer`、`lobsterBubbles` 欄位
- `renderer.ts`：lobster bubble 渲染
- `page.tsx`：lobster 點擊/rage 觸發 UI
- 常數：`LOBSTER_*` 相關常數

### 4. 貓咪行為設計
**選擇**：擴充現有 `updateCat()` 加入狀態機：
- `WANDER`：隨機漫步（現有行為）
- `SIT`：在某個位置坐下 idle（新增 idle sprite，持續 5-15 秒）
- `SLEEP`：在家具旁睡覺（新增 sleep sprite，持續 10-30 秒）

狀態轉換機率：漫步完一段路後，40% 繼續漫步、30% 坐下、30% 睡覺。

### 5. 貓咪數量
**選擇**：預設 2 隻貓咪，用不同色系區分（現有橘貓 + 新增灰貓變體）。

## Risks / Trade-offs

- **[移除龍蝦可能遺漏引用]** → 用全文搜尋 `lobster`/`Lobster`/`LOBSTER` 確保清除乾淨
- **[貓咪 sleep sprite 工作量]** → 最小化設計：sleep 只是趴下的靜態 sprite，不需複雜動畫
- **[排序造成列表跳動]** → 狀態變更不頻繁，可接受；若有問題可加 transition 動畫
