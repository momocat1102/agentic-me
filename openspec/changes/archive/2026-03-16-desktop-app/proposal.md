## Why

Central Command 目前只能用瀏覽器分頁存取，沒有獨立 app 的感覺。加上 PWA 支援後，桌面可以安裝為獨立視窗應用（有自己的圖示和工作列入口），手機也能安裝到主畫面，跨裝置都能用。Server 繼續跑在 WSL2，前端純粹加上 PWA 能力，改動量極小。

## What Changes

- 新增 PWA manifest（`manifest.json`）：應用名稱、圖示、主題色、display: standalone
- 新增 Service Worker：離線快取靜態資源、app shell 策略
- 新增應用程式圖示（多尺寸 PNG + favicon）
- 修改 Next.js `layout.tsx` 加入 manifest link 和 theme-color meta
- 新增 iOS 支援的 meta tags（`apple-mobile-web-app-capable` 等）
- 保留原有所有功能不變，純粹增加 PWA 層

## Capabilities

### New Capabilities
- `pwa-manifest`: PWA manifest 配置與圖示，讓瀏覽器識別為可安裝應用
- `service-worker`: Service Worker 快取策略，提供離線 app shell 和更快的載入速度

### Modified Capabilities
（無既有 spec 需要修改）

## Impact

- **dashboard/public/**: 新增 `manifest.json`、應用圖示檔案
- **dashboard/src/app/layout.tsx**: 加入 manifest link、theme-color、apple meta tags
- **dashboard/public/sw.js**: 新增 Service Worker 檔案
- **Dependencies**: 無新增依賴（純原生 PWA API）
- **現有功能完全不受影響**
