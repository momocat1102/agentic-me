## Context

Pixel Office 是一個 Canvas 2D 渲染的像素風虛擬辦公室，用於可視化 Agent 活動狀態。目前有 27 種家具、6 種角色外觀、bug flocking 系統、matrix 生成/消失特效。角色有 IDLE/WALK/TYPE 三個 FSM 狀態。渲染管線依序畫：地板 → 家具 → bugs → 角色 → 特效 → 氣泡 → heatmap → 照片 → 咖啡機 GIF。

地圖 21×17 格，tile 16px，zoom 3×。左右工作區 + 中間走廊 + 下方休息區。

## Goals / Non-Goals

**Goals:**
- 日夜循環讓辦公室有時間流動感
- 環境粒子增加季節氛圍
- 角色社交讓辦公室更有「生活感」
- 更多家具互動讓探索更有趣
- 點擊角色查看即時狀態
- Ctrl+拖曳平移、Ctrl+滾輪縮放，自由探索辦公室

**Non-Goals:**
- 不做音效系統（增加複雜度且 WSL 環境不一定有音訊輸出）
- 不做可編輯佈局（editor mode 已有框架但本次不啟用）
- 不做多人即時互動
- 不改變現有 Agent 同步機制

## Decisions

### 1. 日夜循環：Canvas globalCompositeOperation overlay

**選擇**: 在所有元素渲染後，加一層半透明 overlay 改變色調
**實作**:
- 新增 `dayNightCycle.ts` 模組
- 根據 `new Date().getHours()` 計算當前時段（dawn/day/dusk/night）
- 每個時段有對應的 overlay RGBA 值：
  - Dawn (5-7): 淡橙 `rgba(255, 180, 100, 0.08)`
  - Day (7-17): 無 overlay（或極淡暖光）
  - Dusk (17-19): 橙紫 `rgba(200, 100, 50, 0.12)`
  - Night (19-5): 深藍 `rgba(20, 20, 80, 0.25)`
- 時段之間用 lerp 平滑過渡（每 update 插值）
- 夜間：桌上 PC 和 LAMP 家具加「發光」效果（小圓形 radialGradient 在家具位置）

**替代方案**: 修改每個 tile 的 HSL 值——太侵入性，且效能差

### 2. 環境粒子：簡單粒子池

**選擇**: 固定大小粒子池（~30-50 個粒子），從畫面上方/側邊飄落
**實作**:
- 新增 `particles.ts` 模組
- 粒子類型根據月份自動選擇：
  - 春（3-5）: 櫻花瓣（粉色小方塊，左右飄）
  - 夏（6-8）: 螢火蟲（黃綠點，夜間限定，隨機漂浮）
  - 秋（9-11）: 落葉（橙/棕小方塊，旋轉下落）
  - 冬（12-2）: 雪花（白色小點，緩慢飄落）
- 粒子只在「窗戶區域」或室外邊緣出現，不會在室內亂飛
- 粒子池重複利用：到達底部或邊緣就重置到頂部

### 3. 角色社交：擴充 FSM 加 SOCIAL 狀態

**選擇**: 在 IDLE 狀態中加入社交觸發邏輯
**實作**:
- 不新增 FSM 狀態（避免大改），而是在 IDLE wander 邏輯中加入「社交事件」
- 閒置角色有 20% 機率走向另一個閒置角色（而非隨機 wander）
- 兩個角色在相鄰格子時，雙方同時顯示對話氣泡（從預設對話池隨機抽取）
- 對話持續 3-5 秒，結束後各自回到正常 wander
- 對話池範例：「今天進度如何？」「你看到那個 bug 了嗎？」「咖啡喝了嗎？」

### 4. 角色點擊面板：Popover 重用

**選擇**: 重用現有 furniture popover 的 UI 模式
**實作**:
- Canvas 點擊時先 hit test 角色（優先於家具）
- 命中角色時用 CC API 拉取該 Agent 的即時資料
- 面板顯示：Agent 名稱、狀態（working/idle）、當前專案、最近 3 個完成任務

### 5. 擴充家具互動

在 page.tsx 的 popover 邏輯中新增：
- **沙發** (sofa): 顯示近 24 小時 Agent idle 時間統計
- **書架** (bookshelf/library): 顯示 memcp 記憶庫最近 5 條記憶
- **冰箱** (fridge): 隨機趣味訊息（類似 coffee_machine）
- **植物** (plant): 點擊觸發澆水 emoji 動畫 + 隨機鼓勵語

### 6. Canvas Viewport：Transform-based pan/zoom

**選擇**: 用 `ctx.setTransform()` 實現視窗座標變換
**實作**:
- 新增 `engine/viewport.ts` 模組，維護 `{ offsetX, offsetY, zoom }` 狀態
- **平移**: Ctrl+滑鼠拖曳 → 更新 offsetX/Y（`mousemove` delta 除以 zoom）
- **縮放**: Ctrl+滾輪 → 更新 zoom（範圍 1×-6×，步進 0.5），以滑鼠位置為中心縮放
- 渲染前 `ctx.setTransform(zoom, 0, 0, zoom, offsetX * zoom, offsetY * zoom)`
- 所有 canvas click 事件需反向轉換座標：`worldX = (clientX - offsetX * zoom) / zoom`
- 預設 zoom = 3，offsetX/Y = 0（與目前行為一致）
- 加入「重置視角」按鈕回到預設位置

**為什麼需要 Ctrl 修飾鍵**:
- 避免與正常頁面捲動衝突
- 避免與家具/角色點擊衝突
- 符合常見 2D 編輯器操作慣例（Figma、Miro）

**替代方案**: CSS transform 在外層 div 上——無法正確處理 Canvas 內的 hit test

## Risks / Trade-offs

- **[Risk] 粒子系統影響效能** → 粒子數固定 30-50 個，遠小於 bug 系統（8-16 隻 + IK 運算），影響極小
- **[Risk] 日夜 overlay 太暗看不清** → alpha 值保持很低（0.08-0.25），且提供右鍵選單可關閉
- **[Risk] 社交行為打斷工作動畫** → 只有 idle 狀態的角色會觸發社交，working 角色不受影響
- **[Trade-off] 粒子只在窗戶/邊緣區** → 限制粒子範圍比全畫面飄散更合理（室內不該有雪）
- **[Risk] Viewport transform 影響 hit test** → 所有 click 座標需經過反向轉換，統一在 viewport 模組處理
