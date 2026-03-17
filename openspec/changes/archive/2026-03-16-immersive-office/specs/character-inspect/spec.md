## ADDED Requirements

### Requirement: Click agent to show status panel
使用者 SHALL 能夠點擊辦公室中的角色，顯示該 Agent 的即時狀態面板。

#### Scenario: Click on character
- **WHEN** 使用者點擊畫面上的角色 sprite
- **THEN** 顯示 popover 面板，包含 Agent 名稱、當前狀態（working/idle/offline）、當前專案名稱

#### Scenario: Recent tasks display
- **WHEN** 角色狀態面板開啟
- **THEN** 面板顯示該 Agent 最近 3 個已完成任務（標題 + 完成時間）

#### Scenario: Character click priority over furniture
- **WHEN** 角色 sprite 與家具 sprite 重疊，使用者點擊重疊區域
- **THEN** 優先觸發角色面板，而非家具互動

#### Scenario: Click outside to dismiss
- **WHEN** 面板已開啟，使用者點擊面板外的區域
- **THEN** 面板關閉
