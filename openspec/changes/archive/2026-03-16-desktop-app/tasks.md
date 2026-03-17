## 1. 應用圖示

- [x] 1.1 設計或產生 Central Command 應用圖示（512x512 原圖）
- [x] 1.2 從原圖產出所需尺寸：192x192、512x512、maskable 版本、favicon.ico
- [x] 1.3 將圖示檔案放入 `dashboard/public/icons/`

## 2. PWA Manifest

- [x] 2.1 建立 `dashboard/public/manifest.json`：name、short_name、icons、start_url: "/"、display: "standalone"、theme_color、background_color
- [x] 2.2 修改 `dashboard/src/app/layout.tsx`：加入 `<link rel="manifest">`、`<meta name="theme-color">`
- [x] 2.3 加入 iOS meta tags：`apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style`、`apple-touch-icon`

## 3. Service Worker

- [x] 3.1 建立 `dashboard/public/sw.js`：install event 預快取 app shell、fetch event 實作 cache first（靜態）+ network only（API）
- [x] 3.2 實作離線 fallback：navigation request 失敗時回傳快取的 app shell + 「等待連線」提示
- [x] 3.3 實作 `skipWaiting()` + `clients.claim()`，確保 SW 更新時立即接管
- [x] 3.4 在 `layout.tsx` 或獨立的 client component 中加入 SW 註冊程式碼（`window.onload` 後註冊）

## 4. 離線 UI

- [x] 4.1 建立離線偵測機制（`navigator.onLine` + `online`/`offline` event）
- [x] 4.2 加入連線狀態提示 UI：離線時顯示 banner「等待伺服器連線...」，上線後自動消失並重新載入資料

## 5. 驗證

- [x] 5.1 用 Chrome DevTools → Application → Manifest 驗證 manifest 正確、可安裝
- [x] 5.2 用 Lighthouse PWA audit 驗證基本分數
- [x] 5.3 在桌面安裝為 app，確認獨立視窗、圖示、無網址列
- [x] 5.4 驗證離線 fallback：停掉 server 後 app 顯示等待提示而非錯誤頁
- [x] 5.5 驗證 `npm run dev` 開發模式不受影響
