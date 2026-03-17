## Why

目前的 Pixel Office 使用手繪像素風格，視覺品質參差不齊（部分是 emoji、部分是手工 SpriteData、部分是 tileset 匯入）。使用者希望統一升級為 Neko Cafe 風格——溫馨的貓咪咖啡廳辦公室，並用外部高品質素材取代手寫像素。

兩個素材來源，用途明確分離：
1. **Neko Cafe Asset Pack**（HelloRumin, itch.io）：16×16 地板/牆壁 tileset + 咖啡廳家具 + **3 隻貓 NPC 作為 Agent 外觀** + 6 種甜點
2. **32×32 Pixel Kittens**（Last tick, itch.io）：32×32 貓咪 sprite sheet，免費版含灰/白/橘 3 色，48 種動畫 + 31 種 idle 姿勢，**作為辦公室寵物貓**

## What Changes

- **Agent 外觀換膚**：用 Neko Cafe 的 3 隻貓 NPC sprite 取代現有人類角色外觀，Agent 在辦公室裡變成可愛的貓咪
- **地板/牆壁重繪**：用 Neko Cafe tileset 替換現有地板圖案和牆壁 sprite，營造木地板 + 暖色牆壁的咖啡廳氛圍
- **家具系統更新**：引入 Neko Cafe 的家具 sprite（桌椅、櫃台、烤箱等），替換部分現有家具或新增品項
- **佈局重新設計**：重新規劃辦公室佈局為咖啡廳風格——櫃台區、座位區、工作區
- **寵物貓升級**：用 Last tick 32×32 animated kittens 取代目前的 LPC cats，支援更豐富的動畫
- **裝飾品新增**：甜點、咖啡等裝飾擺設

## Capabilities

### New Capabilities
- `neko-agent-skin`: 用 Neko Cafe 的 16×16 貓 NPC sprite 取代現有 16×24 人類角色作為 Agent 外觀（walk + idle/typing 動畫）
- `neko-tileset-integration`: 從 Neko Cafe Asset Pack 匯入 16×16 地板/牆壁 tileset 到現有著色管線
- `neko-furniture`: 匯入 Neko Cafe 家具 sprite 到 furnitureCatalog，包含新家具類型
- `neko-layout`: 重新設計辦公室佈局為 Neko Cafe 風格
- `animated-pet-kittens`: 整合 Last tick 32×32 animated kittens sprite sheet 作為辦公室寵物貓，支援多色多動畫

### Modified Capabilities

（無現有 spec 需修改）

## Impact

- **素材下載**：使用者需手動從 itch.io 下載兩個素材包，放入 `dashboard/public/assets/pixel-office/`
- **匯入腳本**：需新增/修改 sprite 匯入腳本，將 PNG sprite sheet 轉為 SpriteData 或運行時 drawImage
- **前端程式碼**：
  - `sprites/characterSprites.ts` / `spriteData.ts` — Agent 外觀改用 Neko Cafe 貓 NPC
  - `floorTiles.ts` / `wallTiles.ts` — 新地板牆壁圖案
  - `sprites/tilesetSprites.ts` — 新家具 sprite
  - `layout/furnitureCatalog.ts` — 新家具類型註冊
  - `layout/layoutSerializer.ts` — 新辦公室佈局
  - `sprites/catSpriteSheet.ts` — 寵物貓改用 Last tick sprite sheet
  - `engine/renderer.ts` — Agent 和寵物貓渲染更新
  - `engine/characters.ts` — 動畫幀數對應
- **授權**：兩個素材包皆允許免費商用/個人使用，禁止轉售
- **無 API 變更**：純前端視覺改動
