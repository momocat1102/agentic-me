## 1. Agent 列表排序

- [x] 1.1 在 `page.tsx` 的 activities 渲染前加入排序邏輯：working(0) > idle(1) > offline(2)，同狀態按名稱排序

## 2. 移除龍蝦系統

- [x] 2.1 移除 `officeState.ts` 中的 lobster 相關程式碼：spawnLobster()、spawnHunterLobster()、toggleFirstLobsterRage()、getFirstLobsterAt()、LOBSTER_ID/HUNTER_LOBSTER_ID 常數、lobster bubble 更新邏輯
- [x] 2.2 移除 `characters.ts` 中的 isLobster 分支和 rage speed factor
- [x] 2.3 移除 `types.ts` 中的 isLobster、lobsterRageTimer、lobsterBubbles 欄位
- [x] 2.4 移除 `renderer.ts` 中的 lobster bubble 渲染程式碼
- [x] 2.5 移除 `page.tsx` 中的 lobster 點擊/rage 觸發 UI 程式碼
- [x] 2.6 移除所有 LOBSTER_* 常數定義
- [x] 2.7 全文搜尋 "lobster"（不分大小寫）確認零殘留

## 3. 擴充貓咪 Sprite

- [x] 3.1 在 `catSprites.ts` 新增灰貓色系的 walk sprite（4 方向 x 4 幀），基於現有橘貓修改顏色
- [x] 3.2 新增 sit/idle sprite（至少 2 幀，貓咪坐姿）
- [x] 3.3 新增 sleep sprite（1 幀靜態，貓咪趴下）
- [x] 3.4 導出新的 sprite 介面，支援 walk/sit/sleep 動畫選擇

## 4. 貓咪行為系統

- [x] 4.1 在 `types.ts` 新增貓咪行為狀態：CatBehavior = 'wander' | 'sit' | 'sleep'，以及相關 timer 欄位
- [x] 4.2 擴充 `characters.ts` 的 `updateCat()` 加入 SIT 和 SLEEP 狀態邏輯（含隨機持續時間）
- [x] 4.3 實作狀態轉換機率（40% wander、30% sit、30% sleep）
- [x] 4.4 修改 `officeState.ts` 的 cat spawn 邏輯：生成 2 隻不同色系的貓咪（橘貓 + 灰貓）

## 5. 整合驗證

- [x] 5.1 確認 TypeScript 編譯通過（`npx tsc --noEmit`）
- [x] 5.2 確認 Next.js build 通過
- [ ] 5.3 視覺驗證：辦公室中有 2 隻貓漫步/坐下/睡覺，無龍蝦，Agent 列表正確排序
