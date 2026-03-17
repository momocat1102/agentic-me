## ADDED Requirements

### Requirement: Lobster system removal
系統 SHALL 完全移除龍蝦相關功能，包括：main lobster spawn、hunter lobster spawn、rage mode、lobster bubble 特效、lobster 點擊互動。移除後不得殘留任何 lobster 相關程式碼或常數。

#### Scenario: No lobster spawned on init
- **WHEN** OfficeState 初始化完成
- **THEN** characters map 中不存在任何 `isLobster === true` 的角色

#### Scenario: Lobster code fully removed
- **WHEN** 開發者在 pixel-office 目錄搜尋 "lobster"（不分大小寫）
- **THEN** 搜尋結果為零（不含 git history）

### Requirement: Cat pet spawning
系統 SHALL 在辦公室初始化時生成 2 隻貓咪寵物。每隻貓咪 SHALL 有不同的色系（橘貓、灰貓）。貓咪 SHALL 出現在隨機可行走的 tile 上。

#### Scenario: Two cats spawned on init
- **WHEN** OfficeState 初始化完成且辦公室有足夠空間
- **THEN** characters map 中存在恰好 2 個 `isCat === true` 的角色

#### Scenario: Cats have distinct appearances
- **WHEN** 兩隻貓咪被生成
- **THEN** 兩隻貓咪使用不同的 sprite 色系

### Requirement: Cat behavior state machine
貓咪 SHALL 具備三種行為狀態：WANDER（漫步）、SIT（坐下）、SLEEP（睡覺）。

#### Scenario: Cat wanders between tiles
- **WHEN** 貓咪處於 WANDER 狀態
- **THEN** 貓咪 SHALL 沿著 A* 路徑移動到隨機目標 tile，移動速度為 agent 速度的 60%

#### Scenario: Cat sits idle
- **WHEN** 貓咪完成一段漫步後且隨機選中 SIT 狀態
- **THEN** 貓咪 SHALL 在當前位置播放 idle/sit 動畫，持續 5-15 秒

#### Scenario: Cat sleeps near furniture
- **WHEN** 貓咪完成一段漫步後且隨機選中 SLEEP 狀態
- **THEN** 貓咪 SHALL 播放 sleep 動畫，持續 10-30 秒

#### Scenario: State transitions
- **WHEN** 貓咪完成當前行為
- **THEN** 下一個狀態 SHALL 以 40% WANDER、30% SIT、30% SLEEP 的機率隨機選擇

### Requirement: Cat sprite animations
貓咪 SHALL 具備以下 sprite 動畫：walk（4 方向各 4 幀）、idle/sit（至少 2 幀）、sleep（至少 1 幀靜態）。所有 sprite SHALL 使用 SpriteData 格式（16 寬 pixel array）。

#### Scenario: Walk animation plays during movement
- **WHEN** 貓咪在 WANDER 狀態移動中
- **THEN** 顯示對應方向的 walk 動畫（4 幀循環）

#### Scenario: Sit animation plays during idle
- **WHEN** 貓咪在 SIT 狀態
- **THEN** 顯示 sit/idle 動畫

#### Scenario: Sleep animation plays during sleep
- **WHEN** 貓咪在 SLEEP 狀態
- **THEN** 顯示 sleep 動畫（趴下靜態）
