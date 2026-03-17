## ADDED Requirements

### Requirement: Ctrl+drag to pan
使用者 SHALL 能夠按住 Ctrl 鍵並拖曳滑鼠來平移辦公室視角。

#### Scenario: Pan with Ctrl+drag
- **WHEN** 使用者按住 Ctrl 鍵並在 Canvas 上按下滑鼠左鍵拖曳
- **THEN** 辦公室畫面跟隨滑鼠移動方向平移

#### Scenario: No pan without Ctrl
- **WHEN** 使用者不按 Ctrl 直接拖曳
- **THEN** 不觸發平移（正常的點擊/選取行為）

#### Scenario: Cursor change
- **WHEN** 使用者按住 Ctrl 並按下滑鼠
- **THEN** cursor 變為 `grabbing`，放開後恢復

### Requirement: Ctrl+scroll to zoom
使用者 SHALL 能夠按住 Ctrl 鍵並滾動滑鼠滾輪來縮放辦公室視角。

#### Scenario: Zoom in
- **WHEN** 使用者按住 Ctrl 並向上滾動滾輪
- **THEN** 畫面放大，以滑鼠位置為中心

#### Scenario: Zoom out
- **WHEN** 使用者按住 Ctrl 並向下滾動滾輪
- **THEN** 畫面縮小，以滑鼠位置為中心

#### Scenario: Zoom range limits
- **WHEN** zoom 達到最小值（1×）或最大值（6×）
- **THEN** 不再繼續縮放

#### Scenario: Prevent page scroll
- **WHEN** Ctrl+滾輪事件發生在 Canvas 上
- **THEN** 阻止瀏覽器預設的頁面縮放行為（preventDefault）

### Requirement: Reset viewport
使用者 SHALL 能夠一鍵重置視角到預設位置。

#### Scenario: Reset button
- **WHEN** 使用者點擊重置視角按鈕
- **THEN** zoom 回到 3×，平移回到原點（0, 0）

### Requirement: Click coordinate transform
所有 Canvas 點擊事件 SHALL 正確轉換為世界座標，確保 viewport 變換後的 hit test 正確。

#### Scenario: Click after pan
- **WHEN** 使用者平移畫面後點擊家具
- **THEN** 正確觸發該家具的互動（座標轉換正確）

#### Scenario: Click after zoom
- **WHEN** 使用者縮放畫面後點擊角色
- **THEN** 正確觸發該角色的面板（座標轉換正確）
