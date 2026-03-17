## Why

Pixel Office 的 Agent 側邊欄目前沒有排序，online/working 的 Agent 可能被埋在列表底部不易發現。此外，辦公室寵物目前是龍蝦（lobster），使用者希望換成更有辦公室氛圍的貓咪，並透過更豐富的動畫讓辦公室更生動。

## What Changes

- **Agent 列表排序**：側邊欄 AgentChip 按狀態排序 — working > idle > offline
- **移除龍蝦系統**：移除 lobster spawn、rage mode、hunter lobster、相關 bubble 特效
- **新增貓咪寵物系統**：
  - 下載外部貓咪像素素材（16x16，CC0/CC-BY 授權）
  - 新增多種貓咪動畫：idle、walk、sit、sleep
  - 貓咪在辦公室中自然漫步、偶爾在家具旁睡覺
  - 支援多隻貓咪（可設定數量）
- **辦公室氛圍強化**：貓咪互動行為（跟隨 agent、在桌上打瞌睡等）

## Capabilities

### New Capabilities
- `cat-pet-system`: 貓咪寵物系統 — 取代龍蝦，包含貓咪 sprite、動畫、AI 行為（漫步、睡覺、跟隨）
- `agent-list-sorting`: Agent 側邊欄按 online 狀態排序（working > idle > offline）

### Modified Capabilities

（無現有 spec 需修改）

## Impact

- **前端程式碼**：
  - `dashboard/src/app/pixel-office/page.tsx` — Agent 列表排序邏輯
  - `dashboard/src/lib/pixel-office/engine/officeState.ts` — 移除 lobster、新增 cat spawn
  - `dashboard/src/lib/pixel-office/engine/characters.ts` — 貓咪行為邏輯（已有部分 updateCat）
  - `dashboard/src/lib/pixel-office/sprites/catSprites.ts` — 擴充貓咪 sprite 動畫
  - `dashboard/src/lib/pixel-office/types.ts` — 移除 lobster 相關欄位
  - `dashboard/src/lib/pixel-office/engine/renderer.ts` — 移除 lobster bubble 渲染
- **素材**：需下載外部貓咪像素 sprite（CC0 from OpenGameArt 或 itch.io）
- **無 API 變更**：純前端改動
