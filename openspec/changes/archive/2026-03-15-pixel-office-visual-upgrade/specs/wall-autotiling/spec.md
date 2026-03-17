## ADDED Requirements

### Requirement: 牆壁精靈靜態載入
系統 SHALL 在啟動時自動載入 16 個牆壁精靈（由 walls.png 轉碼而來的 TypeScript hex 陣列），並呼叫 `setWallSprites()` 初始化 autotiling 系統。

#### Scenario: 精靈載入完成
- **WHEN** OfficeState 初始化
- **THEN** `hasWallSprites()` SHALL 回傳 true，牆壁 SHALL 使用精靈渲染而非純色填充

#### Scenario: Bitmask autotiling 正確運作
- **WHEN** 一面牆壁的北方和東方有相鄰牆壁
- **THEN** 系統 SHALL 使用 bitmask=3（N+E）對應的精靈渲染該牆壁

### Requirement: 牆壁精靈轉碼腳本
專案 SHALL 提供 `scripts/import-walls.ts` 腳本，從 walls.png（64×128，4×4 grid）提取 16 個 16×32 精靈並轉為 TypeScript SpriteData 格式。

#### Scenario: 執行轉碼腳本
- **WHEN** 執行 `npx tsx scripts/import-walls.ts`
- **THEN** SHALL 產生 `dashboard/src/lib/pixel-office/sprites/wallSprites.ts`，包含 16 個 `SpriteData` 常數
