## ADDED Requirements

### Requirement: 自動存到 localStorage
系統 SHALL 在每次傢俱變動（放置、移動、刪除）後自動將佈局儲存到 `localStorage`。

#### Scenario: 放置傢俱後自動存檔
- **WHEN** 使用者放置一個新傢俱
- **THEN** 完整佈局 JSON SHALL 立即存入 `localStorage` key `pixel-office-layout`

#### Scenario: 重新載入頁面時恢復佈局
- **WHEN** 使用者重新載入 pixel-office 頁面
- **THEN** 系統 SHALL 從 localStorage 讀取佈局，若存在則使用它取代預設佈局

### Requirement: 匯出 / 匯入 JSON
使用者 SHALL 能匯出佈局為 JSON 檔案，以及匯入 JSON 檔案來載入佈局。

#### Scenario: 匯出 JSON
- **WHEN** 使用者點擊 "匯出佈局" 按鈕
- **THEN** 瀏覽器 SHALL 下載一個 `.json` 檔案，內容為完整的 OfficeLayout 物件

#### Scenario: 匯入 JSON
- **WHEN** 使用者點擊 "匯入佈局" 並選擇一個有效的 JSON 檔案
- **THEN** 地圖 SHALL 更新為匯入的佈局，同時存入 localStorage

### Requirement: 重置為預設佈局
使用者 SHALL 能重置佈局回到 `createDefaultLayout()` 的預設狀態。

#### Scenario: 重置佈局
- **WHEN** 使用者點擊 "重置佈局" 按鈕並確認
- **THEN** localStorage 中的佈局 SHALL 被清除，地圖恢復為預設佈局
