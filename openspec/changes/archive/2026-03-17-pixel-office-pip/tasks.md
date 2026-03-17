## 1. Document PiP 核心邏輯

- [x] 1.1 建立 `dashboard/src/lib/pixel-office/pip.ts`：封裝 Document PiP API 操作（feature detect、requestWindow、Canvas 移動、pagehide 監聽、cleanup）
- [x] 1.2 實作 `launchPip(canvas, options)`：呼叫 `documentPictureInPicture.requestWindow({ width: 400, height: 300 })`，注入 CSS（黑色背景、margin 歸零、canvas 滿版），將 Canvas appendChild 到 PiP window
- [x] 1.3 實作 `closePip()`：關閉 PiP 視窗，將 Canvas 移回原始容器
- [x] 1.4 實作 PiP 視窗 resize 監聯：Canvas 動態調整實際像素尺寸配合 PiP 視窗大小
- [x] 1.5 實作 `pagehide` 事件監聽：PiP 視窗被使用者關閉時自動將 Canvas 移回原始頁面

## 2. 頁面 UI 整合

- [x] 2.1 在 page.tsx 控制區域新增「子母畫面」按鈕（圖標 + 文字），支援 feature detect disabled 狀態和 tooltip
- [x] 2.2 新增 `isPipActive` 狀態：控制頁面在 PiP 彈出時顯示佔位提示（「已彈出至子母畫面」文字 + 收回按鈕）
- [x] 2.3 PiP 活躍時隱藏/disable 編輯按鈕和 Agent Chip Bar 互動
- [x] 2.4 PiP 中停用互動功能：Canvas 在 PiP 視窗時，忽略 click 事件（不顯示彈窗）

## 3. TypeScript 型別

- [x] 3.1 新增 `DocumentPictureInPicture` 型別宣告（全域 `documentPictureInPicture` API 的 TypeScript 定義，因為尚未內建於 lib.dom.d.ts）

## 4. 驗證

- [ ] 4.1 驗證 PiP 彈出後角色動畫、日夜循環正常渲染
- [ ] 4.2 驗證 PiP 視窗 resize 時 Canvas 正確縮放
- [ ] 4.3 驗證關閉 PiP 後 Canvas 正確移回頁面、恢復正常操作
- [ ] 4.4 驗證不支援的瀏覽器顯示正確提示
- [x] 4.5 tsc 編譯通過、next build 通過
