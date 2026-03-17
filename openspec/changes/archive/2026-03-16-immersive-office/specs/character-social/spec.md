## ADDED Requirements

### Requirement: Social interaction between idle agents
閒置狀態的角色 SHALL 有機率走向其他閒置角色進行對話互動。

#### Scenario: Social approach
- **WHEN** 一個角色處於 IDLE 狀態且附近有另一個 IDLE 角色
- **THEN** 有 20% 機率（每次 wander 判定時）走向該角色

#### Scenario: Conversation display
- **WHEN** 兩個角色在相鄰格子相遇
- **THEN** 雙方同時顯示對話氣泡（從預設對話池隨機抽取），持續 3-5 秒

#### Scenario: Working agents excluded
- **WHEN** 角色處於 TYPE（工作中）狀態
- **THEN** 不會被社交互動打擾，其他角色不會走來聊天

### Requirement: Break area behavior
閒置角色 SHALL 有機率走到休息區（沙發、咖啡機附近）休息。

#### Scenario: Coffee break
- **WHEN** 角色處於 IDLE 狀態
- **THEN** 有機率走向咖啡機位置，到達後顯示 ☕ 氣泡

#### Scenario: Sofa rest
- **WHEN** 角色走到沙發位置
- **THEN** 角色面向沙發站立片刻，顯示休息相關氣泡
