## ADDED Requirements

### Requirement: Web app manifest
Dashboard SHALL 提供 `manifest.json`，包含應用名稱、圖示、主題色、`display: standalone`，使瀏覽器識別為可安裝的 PWA。

#### Scenario: Manifest is served
- **WHEN** 瀏覽器請求 `/manifest.json`
- **THEN** 回傳有效的 Web App Manifest，包含 `name`、`short_name`、`icons`、`start_url`、`display`、`theme_color`、`background_color`

#### Scenario: Installable on desktop
- **WHEN** 使用者用 Chrome 或 Edge 開啟 dashboard
- **THEN** 瀏覽器網址列出現「安裝」按鈕或提示

#### Scenario: Installable on mobile
- **WHEN** 使用者用手機瀏覽器開啟 dashboard
- **THEN** 瀏覽器提示「加到主畫面」

### Requirement: Application icons
Dashboard SHALL 提供多尺寸應用圖示，涵蓋桌面和行動裝置需求。

#### Scenario: Icon sizes provided
- **WHEN** 瀏覽器解析 manifest 的 icons 陣列
- **THEN** 至少包含 192x192 和 512x512 兩個尺寸的 PNG 圖示

#### Scenario: Maskable icon
- **WHEN** Android 系統顯示 adaptive icon
- **THEN** 使用 purpose: maskable 的圖示，確保安全區域內正確顯示

#### Scenario: Favicon
- **WHEN** 瀏覽器載入頁面
- **THEN** 分頁顯示自訂 favicon

### Requirement: Standalone display mode
安裝後的應用 SHALL 以 standalone 模式顯示——沒有瀏覽器網址列和工具列，看起來像原生應用。

#### Scenario: No browser chrome
- **WHEN** 使用者從桌面捷徑或手機主畫面開啟已安裝的 app
- **THEN** 應用以全視窗顯示，不顯示瀏覽器的網址列、書籤列或其他 UI

#### Scenario: Theme color applied
- **WHEN** 應用以 standalone 模式顯示
- **THEN** 系統標題列 / 狀態列使用 manifest 中定義的 theme_color

### Requirement: iOS meta tags
Dashboard SHALL 包含 Apple 特有的 meta tags，確保在 iOS Safari 上的 PWA 體驗正確。

#### Scenario: iOS standalone mode
- **WHEN** iOS 使用者將網頁加到主畫面後開啟
- **THEN** 應用以 standalone 模式顯示（`apple-mobile-web-app-capable`）

#### Scenario: iOS status bar style
- **WHEN** iOS PWA 執行中
- **THEN** 狀態列樣式與應用主題一致（`apple-mobile-web-app-status-bar-style`）
