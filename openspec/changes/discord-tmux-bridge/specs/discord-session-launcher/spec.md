## ADDED Requirements

### Requirement: cc-connect 多專案配置
系統 SHALL 為每個 Discord 專案頻道建立獨立的 cc-connect `[[projects]]` 配置區塊，每個區塊綁定特定的 `channel_id` 和對應專案的 `work_dir`。

#### Scenario: 從 channel-map.json 生成多專案 config
- **WHEN** 執行 config 生成腳本
- **THEN** 系統讀取 `channel-map.json` 中的所有頻道映射，為每個頻道生成一個 `[[projects]]` 區塊，`work_dir` 指向對應的專案資料夾，`channel_id` 綁定該頻道

#### Scenario: 頻道訊息只由對應專案處理
- **WHEN** 使用者在 `#macs-coder` 頻道發送訊息
- **THEN** 只有 `macs-coder` 專案的 Claude Code session 收到並處理該訊息，其他專案的 session 不會回應

### Requirement: Session 冪等啟動
啟動腳本 SHALL 在啟動前檢查對應的 Claude Code session 是否已存在，已存在則跳過，確保不會重複啟動。

#### Scenario: 首次啟動專案 session
- **WHEN** 執行啟動腳本且該專案沒有正在運行的 Claude Code session
- **THEN** 系統在 tmux 中建立新 window，cd 到專案目錄，啟動 Claude Code（bypass permissions 模式）

#### Scenario: 重複啟動已存在的 session
- **WHEN** 執行啟動腳本且該專案的 Claude Code session 已在運行
- **THEN** 系統跳過啟動，不建立新 session，輸出 "already running" 提示

### Requirement: 啟停整合
Discord session 的啟停 SHALL 整合到現有的 `start.sh` / `stop.sh` 流程中。

#### Scenario: start.sh 啟動時預建 session
- **WHEN** 執行 `start.sh`
- **THEN** 在啟動 CC server、cc-connect、slash bot 之後，為所有已配置的專案預啟動 Claude Code session

#### Scenario: stop.sh 清理所有 session
- **WHEN** 執行 `stop.sh`
- **THEN** 系統停止所有專案的 Claude Code session 和 cc-connect，釋放所有資源
