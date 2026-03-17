## ADDED Requirements

### Requirement: Service Worker registration
Dashboard SHALL 在頁面載入時註冊 Service Worker，且不影響首次載入效能。

#### Scenario: SW registered after load
- **WHEN** 頁面完成載入（`window.onload`）
- **THEN** 註冊 `/sw.js` 為 Service Worker

#### Scenario: SW not supported
- **WHEN** 瀏覽器不支援 Service Worker
- **THEN** 應用正常運作，不顯示錯誤

### Requirement: Static asset caching
Service Worker SHALL 快取靜態資源（JS、CSS、字型、圖片），使用 Cache First 策略加速載入。

#### Scenario: Cache first for hashed assets
- **WHEN** 請求路徑包含 hash fingerprint 的靜態資源（如 `/_next/static/...`）
- **THEN** 優先從 cache 回傳；若 cache miss 則 fetch 並存入 cache

#### Scenario: App shell precache
- **WHEN** Service Worker 安裝（install event）
- **THEN** 預快取 app shell 所需的最小資源集（首頁 HTML、核心 CSS/JS）

### Requirement: API requests bypass cache
Service Worker SHALL NOT 快取 API 請求，確保 dashboard 顯示即時資料。

#### Scenario: API passthrough
- **WHEN** 請求路徑為 `/api/*`
- **THEN** Service Worker 不攔截，直接走網路

#### Scenario: WebSocket unaffected
- **WHEN** 頁面建立 WebSocket 連線（port 4001）
- **THEN** Service Worker 不影響 WebSocket 連線

### Requirement: Offline fallback
Service Worker SHALL 在離線時顯示友善的等待畫面，而非瀏覽器預設的離線錯誤頁。

#### Scenario: Offline navigation
- **WHEN** 使用者離線時嘗試導航到任何頁面
- **THEN** 顯示已快取的 app shell，並在畫面上提示「等待伺服器連線...」

#### Scenario: Auto reconnect
- **WHEN** 網路恢復
- **THEN** 頁面自動重新載入最新資料（不需手動重新整理）

### Requirement: Immediate update
Service Worker 更新時 SHALL 立即接管，不等待使用者關閉所有分頁。

#### Scenario: Skip waiting
- **WHEN** 新版本的 Service Worker 下載完成
- **THEN** 自動執行 `skipWaiting()` 並 `clients.claim()`，立即啟用新版本
