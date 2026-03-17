## ADDED Requirements

### Requirement: 執行型指令直接橋接
執行型 slash commands（/done、/propose、/apply）SHALL 透過 tmux send-keys 直接將指令送入對應專案的 Claude Code session，不再使用 `[SLASH]` 文字訊息中轉。

#### Scenario: /done 指令橋接
- **WHEN** 使用者在 `#system-agent` 頻道執行 `/done summary="完成 API 開發"`
- **THEN** slash bot 找到 system-agent 對應的 tmux session，透過 `tmux send-keys` 送入 `/done 完成 API 開發`，並回覆 ephemeral 確認訊息

#### Scenario: /propose 指令橋接
- **WHEN** 使用者在 `#macs-coder` 頻道執行 `/propose name="add-experiments"`
- **THEN** slash bot 透過 tmux send-keys 在 macs-coder 的 Claude session 中送入 `/opsx:propose add-experiments`

#### Scenario: 對應 session 不存在時自動啟動
- **WHEN** 使用者執行執行型指令但對應專案的 Claude session 未啟動
- **THEN** slash bot 先呼叫啟動腳本建立 session，等待就緒後再送入指令

### Requirement: 查詢型指令保持不變
查詢型 slash commands（/progress、/overview）SHALL 繼續直接查詢 CC API 回覆 Embed，不經過 Claude session。

#### Scenario: /progress 不受架構變更影響
- **WHEN** 使用者執行 `/progress`
- **THEN** slash bot 直接向 CC API 請求資料並回覆 Embed，與之前行為一致

### Requirement: 移除 SLASH 前綴機制
系統 SHALL 移除 CLAUDE.md 中的 `[SLASH]` 訊息解析規則，因為不再需要透過文字訊息中轉。

#### Scenario: 清理 SLASH 相關程式碼
- **WHEN** 此變更完成後
- **THEN** `/mnt/d/WorkSpace/CLAUDE.md` 中不再包含 `[SLASH]` 相關的解析規則，forward.ts 不再使用 `channel.send('[SLASH] ...')` 機制
