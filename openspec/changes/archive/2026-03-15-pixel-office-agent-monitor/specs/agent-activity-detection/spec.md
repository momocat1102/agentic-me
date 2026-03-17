## ADDED Requirements

### Requirement: JSONL Session 活動掃描
Server SHALL 提供 `/api/agents/activity` 端點，掃描 `~/.claude/projects/` 下的 JSONL session 檔案，回傳每個 Agent 的即時活動狀態。

#### Scenario: 偵測活動中的 Agent
- **WHEN** 某 Agent 的 JSONL session 檔案在最近 5 分鐘內有新的 assistant message
- **THEN** 該 Agent 的 activity status SHALL 為 `working`

#### Scenario: 偵測閒置 Agent
- **WHEN** 某 Agent 在 agents 表中已註冊，但其 JSONL session 最近 5 分鐘無新 message
- **THEN** 該 Agent 的 activity status SHALL 為 `idle`

#### Scenario: 偵測離線 Agent
- **WHEN** 某 Agent 在 agents 表中已註冊，但找不到對應的 JSONL session 檔案或最近 24 小時無任何活動
- **THEN** 該 Agent 的 activity status SHALL 為 `offline`

### Requirement: 活動狀態快取
Server SHALL 快取 Agent 活動狀態掃描結果，避免頻繁檔案 I/O。

#### Scenario: 快取有效期內
- **WHEN** 距離上次掃描不到 30 秒，收到 `/api/agents/activity` 請求
- **THEN** SHALL 回傳快取結果，不重新掃描 JSONL 檔案

#### Scenario: 快取過期
- **WHEN** 距離上次掃描超過 30 秒，收到 `/api/agents/activity` 請求
- **THEN** SHALL 重新掃描 JSONL 檔案並更新快取

### Requirement: WebSocket 即時狀態推送
Server SHALL 每 30 秒掃描一次 Agent 活動狀態，當狀態發生變更時透過 WebSocket 推送 `agent:activity` 事件。

#### Scenario: Agent 從 idle 變為 working
- **WHEN** 定時掃描偵測到某 Agent 從 idle 變為 working
- **THEN** SHALL 透過 WS broadcaster 推送 `{ type: "agent:activity", payload: { agentId, status: "working", ... } }`

#### Scenario: 無狀態變更
- **WHEN** 定時掃描結果與上次相同
- **THEN** SHALL 不推送任何 WebSocket 訊息

### Requirement: Activity API 回應格式
`GET /api/agents/activity` SHALL 回傳 JSON 陣列，每個元素包含 Agent 活動資訊。

#### Scenario: 正常回應
- **WHEN** 收到 GET /api/agents/activity 請求
- **THEN** 回傳格式為 `[{ agentId, agentName, status: "working"|"idle"|"offline", lastActiveAt: ISO8601|null, currentProject: string|null, currentSessionId: string|null }]`
