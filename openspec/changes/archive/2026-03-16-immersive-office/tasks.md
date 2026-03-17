## 1. 日夜循環

- [x] 1.1 建立 `engine/dayNightCycle.ts`：根據 `new Date().getHours()` 計算時段（dawn/day/dusk/night），輸出 overlay RGBA 值，時段之間 lerp 平滑過渡
- [x] 1.2 在 `renderer.ts` 渲染管線最後加入日夜 overlay：用 `globalCompositeOperation = 'multiply'` 或半透明 fillRect
- [x] 1.3 實作夜間家具發光效果：PC（ON 狀態）畫淡藍光暈、LAMP 畫暖黃光暈，用 `radialGradient`
- [x] 1.4 在 page.tsx 加入日夜循環開關按鈕（右上角小圖示）

## 2. 環境粒子系統

- [x] 2.1 建立 `engine/particles.ts`：粒子池（40 個）、粒子結構（x, y, vx, vy, type, alpha, rotation）、update 和 reset 邏輯
- [x] 2.2 實作四季粒子類型：春（粉色飄落+搖擺）、夏（黃綠漂浮，夜限定）、秋（橙棕旋轉下落）、冬（白色緩慢飄落）
- [x] 2.3 限制粒子生成區域：只在畫面上方邊緣和左右邊緣生成，不進入室內中央
- [x] 2.4 在 `renderer.ts` 加入粒子渲染（在 overlay 之前、家具之後）

## 3. 角色社交互動

- [x] 3.1 在 `characters.ts` IDLE wander 邏輯中加入社交判定：20% 機率走向附近的 IDLE 角色
- [x] 3.2 實作對話觸發：兩個角色在相鄰格子時，雙方推送對話氣泡（3-5 秒）
- [x] 3.3 建立對話池（中英文各 15+ 條）：工作相關、休閒聊天、搞笑對話
- [x] 3.4 加入休息區行為：IDLE 角色有機率走向咖啡機/沙發，到達後顯示對應 emoji 氣泡

## 4. 角色點擊面板

- [x] 4.1 在 page.tsx canvas click handler 加入角色 hit test（優先於家具），根據角色 tile 位置 + sprite 大小判定
- [x] 4.2 建立 Agent 狀態 popover：顯示名稱、狀態 badge、當前專案、最近 3 個完成任務
- [x] 4.3 API 呼叫：用 `/api/tasks?agentId=xxx&limit=3` 拉取該 Agent 的近期任務

## 5. 擴充家具互動

- [x] 5.1 沙發互動：點擊顯示各 Agent 近 24 小時 idle 時間佔比（用 `/api/agents/activity` 資料計算）
- [x] 5.2 書架互動：點擊顯示 memcp 最近 5 條記憶（呼叫 memcp API 或用 `/api/memory` 代理）
- [x] 5.3 冰箱互動：隨機趣味訊息池（10+ 條），類似 coffee_machine 風格
- [x] 5.4 植物互動：點擊顯示 💧 + 隨機鼓勵語，用 pushCodeSnippet 在植物位置顯示

## 6. Canvas Viewport（平移/縮放）

- [x] 6.1 建立 `engine/viewport.ts`：維護 `{ offsetX, offsetY, zoom }` 狀態，提供 `screenToWorld(x, y)` 座標轉換函式
- [x] 6.2 在 `renderer.ts` 渲染前加入 `ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY)`，渲染後 `ctx.resetTransform()`（日夜 overlay 用螢幕座標畫）
- [x] 6.3 在 page.tsx 加入 Ctrl+mousedown/mousemove 平移邏輯：按住 Ctrl+拖曳更新 offsetX/Y，cursor 切換為 grabbing
- [x] 6.4 在 page.tsx 加入 Ctrl+wheel 縮放邏輯：以滑鼠位置為中心，zoom 範圍 1×-6×，步進 0.25，preventDefault 防止瀏覽器縮放
- [x] 6.5 修改所有 canvas click hit test：用 `viewport.screenToWorld()` 轉換座標後再判定家具/角色
- [x] 6.6 加入「重置視角」按鈕（page.tsx UI），點擊回到 zoom=3, offset=(0,0)

## 7. 驗證

- [ ] 7.1 驗證日夜循環在不同時段正常顯示，夜間燈光效果可見
- [ ] 7.2 驗證四季粒子在對應月份正確顯示，不進入室內
- [ ] 7.3 驗證 IDLE 角色會走向其他角色聊天，對話氣泡正常顯示
- [ ] 7.4 驗證點擊角色顯示狀態面板，資料正確
- [ ] 7.5 驗證新家具互動（沙發、書架、冰箱、植物）正常運作
- [ ] 7.6 驗證 Ctrl+拖曳平移和 Ctrl+滾輪縮放正常運作，不按 Ctrl 時不觸發
- [ ] 7.7 驗證平移/縮放後點擊家具和角色的 hit test 座標正確
- [ ] 7.8 驗證所有新功能不影響現有渲染效能（FPS 維持流暢）
