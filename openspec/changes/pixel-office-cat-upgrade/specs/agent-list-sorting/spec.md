## ADDED Requirements

### Requirement: Agent list sorted by online status
側邊欄的 Agent 列表 SHALL 按狀態優先級排序：working（最上）> idle > offline（最下）。同狀態內 SHALL 按 agent 名稱字母順序排列。

#### Scenario: Mixed status agents display order
- **WHEN** 有 3 個 agent：AgentA (offline)、AgentB (working)、AgentC (idle)
- **THEN** 列表顯示順序為 AgentB (working) → AgentC (idle) → AgentA (offline)

#### Scenario: Same status agents sorted alphabetically
- **WHEN** 有 3 個 working agent：Zeta、Alpha、Gamma
- **THEN** 列表顯示順序為 Alpha → Gamma → Zeta

#### Scenario: Status change triggers re-sort
- **WHEN** 一個 offline agent 變為 working
- **THEN** 該 agent SHALL 移動到列表頂部（working 區段）
