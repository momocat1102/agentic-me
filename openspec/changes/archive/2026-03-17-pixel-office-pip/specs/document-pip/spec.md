## ADDED Requirements

### Requirement: PiP 啟動按鈕
Pixel Office 頁面 SHALL 在控制區域顯示「子母畫面」按鈕，允許使用者將 Canvas 彈出為 OS 層級的浮動視窗。

#### Scenario: 瀏覽器支援 Document PiP
- **WHEN** 瀏覽器支援 `documentPictureInPicture` API
- **THEN** 按鈕 SHALL 顯示為可點擊狀態，點擊後啟動 PiP

#### Scenario: 瀏覽器不支援 Document PiP
- **WHEN** 瀏覽器不支援 `documentPictureInPicture` API
- **THEN** 按鈕 SHALL 顯示為 disabled 狀態，並附 tooltip 提示「需要 Chrome 116+ 或 Edge 116+」

### Requirement: PiP 視窗建立
點擊按鈕後 SHALL 使用 Document Picture-in-Picture API 建立 OS 層級的 always-on-top 浮動視窗。

#### Scenario: 成功彈出
- **WHEN** 使用者點擊「子母畫面」按鈕
- **THEN** 系統 SHALL 呼叫 `documentPictureInPicture.requestWindow({ width: 400, height: 300 })`，將 Canvas 元素移入 PiP 視窗，並注入必要的 CSS（黑色背景、margin 歸零）

#### Scenario: Canvas 持續渲染
- **WHEN** Canvas 被移入 PiP 視窗
- **THEN** 遊戲迴圈 SHALL 持續運作，角色動畫、家具、日夜循環 SHALL 正常渲染

#### Scenario: PiP 視窗可調整大小
- **WHEN** PiP 視窗顯示中
- **THEN** 使用者 SHALL 可使用 OS 原生功能拖曳移動和調整視窗大小，Canvas SHALL 監聽 resize 事件動態調整渲染尺寸

### Requirement: 原始頁面彈出狀態
PiP 啟動後，原始的 Pixel Office 頁面 SHALL 顯示彈出狀態提示。

#### Scenario: 彈出後頁面狀態
- **WHEN** Canvas 已彈出至 PiP 視窗
- **THEN** 原始頁面的 Canvas 區域 SHALL 顯示「已彈出至子母畫面」提示文字，並提供「收回」按鈕

#### Scenario: 點擊收回
- **WHEN** 使用者在原始頁面點擊「收回」按鈕
- **THEN** PiP 視窗 SHALL 關閉，Canvas SHALL 移回原始頁面容器恢復正常顯示

### Requirement: PiP 視窗關閉處理
PiP 視窗關閉時 SHALL 自動將 Canvas 移回原始頁面。

#### Scenario: 使用者關閉 PiP 視窗
- **WHEN** 使用者點擊 PiP 視窗的關閉按鈕（OS 原生）
- **THEN** 系統 SHALL 監聽 `pagehide` 事件，將 Canvas 移回原始頁面容器，恢復正常全頁面模式

#### Scenario: Dashboard 分頁關閉
- **WHEN** 使用者關閉 Dashboard 瀏覽器分頁
- **THEN** PiP 視窗 SHALL 自動關閉（瀏覽器原生行為）

### Requirement: PiP 中停用互動功能
PiP 視窗中 SHALL 停用需要 UI 覆蓋層的互動功能。

#### Scenario: 編輯模式不可用
- **WHEN** Canvas 在 PiP 視窗中
- **THEN** 編輯模式、家具彈窗、Agent 點擊彈窗 SHALL 停用，僅保留純觀賞渲染
