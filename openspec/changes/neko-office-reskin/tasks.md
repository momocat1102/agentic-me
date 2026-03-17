## 1. 素材準備與 Tileset Loader

- [x] 1.1 建立素材目錄結構 `dashboard/public/assets/pixel-office/neko-cafe/`，加入 README 說明素材放置方式
- [x] 1.2 新增 `TilesetManager` 類別（`sprites/tilesetManager.ts`）：載入 tileset PNG、提供 `drawTile(ctx, tileId, x, y, zoom)` 方法、支援素材缺失 fallback
- [x] 1.3 在 `page.tsx` 載入 Neko Cafe tileset PNG 到 `tilesetImgRef`，傳入 renderer

## 2. Agent 貓咪外觀（Neko Cafe 貓 NPC）

- [x] 2.1 下載 Neko Cafe Asset Pack，分析貓 NPC sprite sheet 的 grid layout（方向數、幀數、3 隻貓的排列）⚠️ 需手動下載
- [x] 2.2 新增 `sprites/agentCatSheet.ts`：定義 Agent 貓 NPC 的 frame mapping（AGENT_CAT_SHEET_URL、variant→座標偏移、方向→row、walk/idle 幀數）
- [x] 2.3 實作 `getAgentCatFrame(ch: Character)` 函式：根據 Agent 的 palette（% 3）選擇貓 variant，根據 state/dir 選擇動畫幀
- [x] 2.4 修改 `renderer.ts`：Agent 渲染優先使用 `agentCatSheetImg` + `getAgentCatFrame()`（drawImage 裁切），fallback 到 SpriteData
- [x] 2.5 調整 Agent 渲染尺寸：16×16 貓 NPC 的 drawY 錨點、CHARACTER_SITTING_OFFSET_PX、名牌位置
- [x] 2.6 在 `page.tsx` 載入 Neko Cafe 貓 NPC sprite sheet 到 `agentCatSheetRef`，傳入 renderFrame

## 3. 寵物貓升級（Last tick 32×32）

- [x] 3.1 下載 Last tick 32×32 Pixel Kittens，分析 sprite sheet 格式（grid/strip layout、方向、幀數）⚠️ 需手動下載
- [x] 3.2 修改 `catSpriteSheet.ts`：更新為 Last tick sprite sheet 的 CAT_SHEET_URL 和 frame mapping（walk 4方向、sit、sleep）
- [x] 3.3 在 `page.tsx` 更新寵物貓 sprite sheet 載入路徑
- [x] 3.4 更新 `characters.ts` 動畫幀數對應（如果 Last tick 每方向幀數不同）

## 4. 地板/牆壁 Tileset 替換

- [x] 4.1 修改 `floorTiles.ts`：新增 tileset-based 地板 tile 定義（wood、tile、carpet），回傳 tileset 座標
- [x] 4.2 修改 `wallTiles.ts`：將 16 種 auto-tiling 牆壁 sprite 對應到 tileset 座標
- [x] 4.3 修改 `renderer.ts` 地板渲染：當 tileset 可用時用 drawImage 裁切，否則 fallback 到 SpriteData
- [x] 4.4 修改 `renderer.ts` 牆壁渲染：同上，支援 tileset + SpriteData 雙路徑

## 5. 家具系統更新

- [x] 5.1 在 `furnitureCatalog.ts` 新增 `spriteSource` 欄位和 tileset rect 座標
- [x] 5.2 新增 Neko Cafe 家具類型：counter、cafe_table、cafe_chair、display_case、coffee_machine、oven
- [x] 5.3 新增裝飾類型：potted_plant_cafe、wall_art、pastry_deco、coffee_cup_deco
- [x] 5.4 修改 `renderer.ts` 家具渲染：根據 spriteSource 選擇 drawImage 或 getCachedSprite

## 6. 佈局重新設計

- [x] 6.1 設計新佈局草圖：21×17 格，劃分櫃台區、座位區、工作區
- [x] 6.2 修改 `layoutSerializer.ts` 的 `createDefaultLayout()`：定義新地板 tile 分區
- [x] 6.3 在新佈局中放置家具（counter + coffee_machine 在櫃台區、cafe_table + cafe_chair 在座位區、desk + pc 在工作區）
- [x] 6.4 確認 Agent spawn 位置與 pathfinding 在新佈局中正常運作

## 7. 整合驗證

- [x] 7.1 確認 TypeScript 編譯通過（`npx tsc --noEmit`）
- [x] 7.2 確認 Next.js build 通過
- [ ] 7.3 視覺驗證：Agent 顯示為 Neko Cafe 貓 NPC、寵物貓使用 Last tick 動畫、咖啡廳風格佈局正確
