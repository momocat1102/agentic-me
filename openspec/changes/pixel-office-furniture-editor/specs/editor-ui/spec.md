## ADDED Requirements

### Requirement: 編輯模式切換
頁面 SHALL 提供一個明確的按鈕來切換編輯模式。預設為一般模式（觀看）。

#### Scenario: 進入編輯模式
- **WHEN** 使用者點擊 "編輯" 按鈕
- **THEN** 頁面 SHALL 進入編輯模式，顯示傢俱面板和編輯工具列，Canvas 上顯示格線輔助線

#### Scenario: 退出編輯模式
- **WHEN** 使用者點擊 "完成" 按鈕或按 Escape
- **THEN** 頁面 SHALL 回到一般模式，隱藏編輯 UI，傢俱面板消失

### Requirement: 傢俱目錄面板
編輯模式下 SHALL 顯示傢俱目錄面板，列出所有可放置的傢俱，按 category 分組。

#### Scenario: 顯示分類傢俱列表
- **WHEN** 使用者進入編輯模式
- **THEN** 面板 SHALL 按 category（decor、chairs、storage、wall）分組顯示所有傢俱類型，每個顯示名稱和小預覽圖

#### Scenario: 選擇傢俱準備放置
- **WHEN** 使用者在面板中點擊一個傢俱類型
- **THEN** 游標 SHALL 變為放置模式，滑鼠移到地圖上時顯示傢俱預覽

### Requirement: 格線顯示
編輯模式下 SHALL 在地圖上顯示 tile 格線，幫助使用者精確對齊。

#### Scenario: 顯示格線
- **WHEN** 編輯模式啟用
- **THEN** Canvas SHALL 繪製半透明的 tile 格線覆蓋在地圖上

### Requirement: 編輯工具列
編輯模式下 SHALL 顯示工具列，提供常用操作按鈕。

#### Scenario: 工具列按鈕
- **WHEN** 編輯模式啟用
- **THEN** 工具列 SHALL 包含：匯出佈局、匯入佈局、重置佈局、完成編輯
