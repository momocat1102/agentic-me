## ADDED Requirements

### Requirement: Seasonal particle effects
辦公室 SHALL 根據當前月份自動顯示對應季節的環境粒子效果。

#### Scenario: Spring cherry blossoms (March-May)
- **WHEN** 系統月份為 3-5 月
- **THEN** 粉色小方塊粒子從畫面上方飄落，帶有左右搖擺動態

#### Scenario: Summer fireflies (June-August, night only)
- **WHEN** 系統月份為 6-8 月且處於夜間時段
- **THEN** 黃綠色發光粒子在畫面中緩慢隨機漂浮

#### Scenario: Autumn falling leaves (September-November)
- **WHEN** 系統月份為 9-11 月
- **THEN** 橙色/棕色小方塊粒子從畫面上方旋轉飄落

#### Scenario: Winter snowflakes (December-February)
- **WHEN** 系統月份為 12-2 月
- **THEN** 白色小點粒子從畫面上方緩慢飄落

### Requirement: Particle containment
粒子 SHALL 僅出現在合理的區域，不在室內空間亂飛。

#### Scenario: Particles stay near edges
- **WHEN** 粒子系統運作中
- **THEN** 粒子只在畫面邊緣或窗戶區域出現，不會飄入辦公室中央

### Requirement: Particle pool recycling
粒子系統 SHALL 使用固定大小的粒子池（30-50 個），到達邊界後重置重用。

#### Scenario: No memory leak
- **WHEN** 粒子飄出畫面邊界
- **THEN** 粒子重置到頂部/側邊重新開始，不建立新物件
