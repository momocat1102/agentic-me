## Why

Pixel Office 目前是一個靜態感較重的像素辦公室：家具互動只有 5 種、環境沒有時間變化、角色之間沒有社交互動。加入日夜循環、環境氛圍效果、更多家具互動和角色社交行為，可以讓辦公室從「好看的監控面板」升級為「有生命感的虛擬空間」。

## What Changes

- 新增**日夜循環**：根據真實時間（或加速模擬）改變整體光照色調，夜晚窗戶透光、桌燈亮起
- 新增**環境粒子系統**：窗外落葉/雨滴/飄雪等季節性效果
- 新增**角色社交互動**：Agent 閒置時會走到其他 Agent 旁邊聊天（顯示對話氣泡）、去休息區喝咖啡
- 擴充**家具互動**：點擊沙發顯示 Agent 近期休息統計、點擊書架顯示記憶庫搜尋、點擊冰箱顯示趣味訊息、點擊植物觸發澆水動畫
- 新增**點擊角色互動**：點擊 Agent 角色顯示其狀態詳情（當前任務、累計工作時間、最近完成的任務）
- 新增**視窗操控**：Ctrl+拖曳平移畫面、Ctrl+滾輪縮放，支援觸控板雙指操作
- ~~新增環境音效~~（移除，WSL 環境不適用）

## Capabilities

### New Capabilities
- `day-night-cycle`: 日夜循環光照系統，根據時間改變環境色調與燈光狀態
- `ambient-particles`: 環境粒子效果（落葉、雨滴、飄雪等）
- `character-social`: 角色社交行為（聊天、喝咖啡、互動動畫）
- `character-inspect`: 點擊角色顯示狀態詳情面板
- `canvas-viewport`: Canvas 視窗操控（Ctrl+拖曳平移、Ctrl+滾輪縮放）

### Modified Capabilities
- `pixel-office-engine`: 擴充家具互動種類（沙發、書架、冰箱、植物）

## Impact

- **dashboard/src/lib/pixel-office/engine/**: 新增日夜循環模組、粒子系統、社交 AI 邏輯
- **dashboard/src/lib/pixel-office/engine/renderer.ts**: 加入光照 overlay、粒子渲染、燈光效果
- **dashboard/src/lib/pixel-office/engine/characters.ts**: 擴充 FSM 加入社交狀態
- **dashboard/src/app/pixel-office/page.tsx**: 新增角色點擊面板、擴充家具互動
- **dashboard/src/app/pixel-office/page.tsx**: Canvas 事件處理（Ctrl+drag、Ctrl+wheel）
- **dashboard/src/lib/pixel-office/engine/renderer.ts**: 加入 viewport transform（translate + scale）
- **Dependencies**: 無新增依賴（純 Canvas 2D 實作）
