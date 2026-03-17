## ADDED Requirements

### Requirement: Sofa interaction
點擊沙發 SHALL 顯示 Agent 近 24 小時的閒置時間統計。

#### Scenario: Click sofa
- **WHEN** 使用者點擊沙發家具
- **THEN** popover 顯示各 Agent 近 24 小時 idle 時段佔比

### Requirement: Bookshelf interaction
點擊書架 SHALL 顯示記憶庫最近的記憶條目。

#### Scenario: Click bookshelf
- **WHEN** 使用者點擊書架或圖書館家具
- **THEN** popover 顯示 memcp 最近 5 條記憶（標題 + 時間）

### Requirement: Fridge interaction
點擊冰箱 SHALL 顯示隨機趣味訊息。

#### Scenario: Click fridge
- **WHEN** 使用者點擊冰箱家具
- **THEN** popover 顯示隨機趣味訊息（類似 coffee_machine 的風格）

### Requirement: Plant interaction
點擊植物 SHALL 觸發澆水動畫和鼓勵語。

#### Scenario: Click plant
- **WHEN** 使用者點擊植物家具
- **THEN** 植物上方顯示 💧 emoji 動畫 + 隨機鼓勵語（如「繼續加油！」「今天辛苦了」）
