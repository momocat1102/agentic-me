## ADDED Requirements

### Requirement: 從目錄放置傢俱到地圖
使用者 SHALL 能從傢俱目錄面板選擇一個傢俱類型，然後在地圖上點擊放置。放置時傢俱位置 SHALL 自動對齊 tile 格線（grid snap）。

#### Scenario: 放置一個 2×2 傢俱
- **WHEN** 使用者在傢俱面板點選 "Stovetop"，然後在地圖上 col=14, row=2 處點擊
- **THEN** 一個 STOVETOP 傢俱 SHALL 出現在 (14, 2) 位置，佔據 2×2 格

#### Scenario: 放置時顯示預覽
- **WHEN** 使用者選擇傢俱後移動滑鼠在地圖上方
- **THEN** 一個半透明的傢俱預覽 SHALL 跟隨滑鼠，自動吸附到最近的 tile 格線

### Requirement: 選取並移動已放置的傢俱
使用者 SHALL 能在編輯模式下點選已放置的傢俱來選取它，然後拖拉到新位置。

#### Scenario: 選取傢俱
- **WHEN** 使用者在編輯模式下點擊一個已放置的傢俱
- **THEN** 該傢俱 SHALL 顯示選取高亮（邊框或底色變化）

#### Scenario: 拖拉移動傢俱
- **WHEN** 使用者拖拉已選取的傢俱到新位置
- **THEN** 傢俱 SHALL 移動到新位置（grid snap），佈局資料隨之更新

### Requirement: 刪除傢俱
使用者 SHALL 能刪除已選取的傢俱。

#### Scenario: 按 Delete 鍵刪除
- **WHEN** 使用者選取一個傢俱後按 Delete 或 Backspace 鍵
- **THEN** 該傢俱 SHALL 從地圖上移除

### Requirement: 碰撞偵測
系統 SHALL 在放置或移動傢俱時檢查 footprint 重疊。

#### Scenario: 放置位置與現有傢俱重疊
- **WHEN** 使用者嘗試將傢俱放在已被其他傢俱佔據的位置
- **THEN** 預覽 SHALL 顯示紅色（表示無法放置），點擊 SHALL 不生效

### Requirement: 牆面裝飾放置
系統 SHALL 允許標記為 `canPlaceOnWalls: true` 的傢俱放置在牆面 tile 上。

#### Scenario: 放置牆面掛畫
- **WHEN** 使用者選擇 WALL_ART（canPlaceOnWalls=true）並點擊牆面位置
- **THEN** 該裝飾 SHALL 放置在牆面上並正確渲染
