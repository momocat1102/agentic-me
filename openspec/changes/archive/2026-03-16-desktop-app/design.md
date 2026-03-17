## Context

Central Command dashboard 是 Next.js 16 應用，跑在 WSL2 的 port 3000，API server 在 port 4000。使用者從 Windows 瀏覽器連 `localhost:3000` 使用。

目標是讓 dashboard 可以「安裝」為獨立應用——桌面上有圖示、獨立視窗（沒有瀏覽器網址列）、手機也能裝到主畫面。

## Goals / Non-Goals

**Goals:**
- 桌面瀏覽器（Edge/Chrome）可安裝為獨立視窗應用
- 手機瀏覽器可安裝到主畫面
- 離線時顯示 app shell（基本 UI 框架），等 server 上線後自動恢復
- 零額外依賴，純原生 PWA API

**Non-Goals:**
- Push notifications（目前不需要）
- 背景同步（Background Sync）
- 完整離線功能（dashboard 依賴即時 API 資料，離線只顯示 shell）
- 自訂安裝提示 UI（用瀏覽器原生安裝提示即可）

## Decisions

### 1. 原生 PWA 而非 next-pwa 套件

**選擇**: 手寫 `manifest.json` + `sw.js`，不用 `next-pwa` 或 `@serwist/next`
**原因**:
- 需求極簡（manifest + 基本快取），不需要 Workbox 的複雜功能
- 減少依賴，避免 Next.js 版本升級時的相容性問題
- Service Worker 邏輯只有 ~50 行，不值得引入框架

**替代方案考慮**:
- **next-pwa**: 自動注入 SW、Workbox 整合，但對 Next.js 16 的支援不確定
- **Serwist**: next-pwa 的繼任者，功能強大但對我們的需求 overkill

### 2. Service Worker 快取策略：App Shell + Network First

**選擇**: 靜態資源（JS/CSS/圖片）用 Cache First，API 請求用 Network Only
**原因**:
- 靜態資源有 hash fingerprint，Cache First 安全且快速
- API 資料是即時狀態（Agent 活動、任務進度），快取沒意義
- 離線時顯示 app shell + 「等待連線」提示即可

### 3. 圖示方案

**選擇**: 準備 4 個尺寸的 PNG（192x192、512x512、maskable 各一）+ favicon.ico
**原因**:
- 192 和 512 是 Chrome/Android 的必要尺寸
- maskable icon 確保在 Android adaptive icon 系統中顯示正確
- favicon.ico 供桌面瀏覽器分頁使用

### 4. 手機存取方案（未來）

行動裝置需要能連到 WSL2 的 server。幾個選項：
- **Tailscale**（推薦）: 零設定 mesh VPN，手機和電腦在同一虛擬網路
- **Cloudflare Tunnel**: 免費，公網可達，但有安全考量
- **區域網路直連**: WSL2 port forwarding 到 Windows LAN IP

這不在本次 change 範圍內，但 PWA 本身不需要任何修改就能支援——只要手機能連到 server URL，就能安裝。

## Risks / Trade-offs

- **[Risk] iOS Safari PWA 限制** → iOS PWA 不支援 push notification，但我們不需要；其他功能（standalone mode、home screen icon）正常支援
- **[Risk] localhost 不觸發 PWA 安裝** → Chrome/Edge 對 localhost 有例外，會正常顯示安裝按鈕
- **[Risk] Service Worker 快取導致更新延遲** → SW 用 `skipWaiting()` + `clients.claim()` 確保立即更新
- **[Trade-off] 無完整離線功能** → 可接受，dashboard 本質是即時監控工具，離線只需顯示 shell 等待重連
