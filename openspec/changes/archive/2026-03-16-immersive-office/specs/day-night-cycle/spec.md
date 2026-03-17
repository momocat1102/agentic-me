## ADDED Requirements

### Requirement: Time-based lighting overlay
渲染器 SHALL 根據系統時間在所有元素之上繪製一層半透明色調 overlay，模擬日夜光照變化。

#### Scenario: Daytime (7:00-17:00)
- **WHEN** 系統時間在 7:00-17:00 之間
- **THEN** overlay 為極淡暖光或無 overlay，辦公室維持正常亮度

#### Scenario: Nighttime (19:00-5:00)
- **WHEN** 系統時間在 19:00-5:00 之間
- **THEN** overlay 為半透明深藍色，整體畫面偏暗偏藍

#### Scenario: Smooth transition between periods
- **WHEN** 時間從一個時段過渡到另一個時段（如 dusk 17:00-19:00）
- **THEN** overlay 顏色和透明度平滑漸變，無突然跳變

### Requirement: Nighttime furniture glow
夜間時，有光源的家具（PC、LAMP）SHALL 在其周圍繪製柔和的發光效果。

#### Scenario: PC glow at night
- **WHEN** 夜間且 PC 家具狀態為 ON（有 Agent 在使用）
- **THEN** PC 位置周圍繪製小範圍的淡藍色 radialGradient 光暈

#### Scenario: Lamp always glows at night
- **WHEN** 夜間時段
- **THEN** LAMP 家具位置周圍繪製暖黃色 radialGradient 光暈

### Requirement: Day-night toggle
使用者 SHALL 能夠關閉日夜循環效果。

#### Scenario: Disable day-night cycle
- **WHEN** 使用者透過 UI 控制項關閉日夜循環
- **THEN** overlay 消失，回到無光照修改的預設狀態
