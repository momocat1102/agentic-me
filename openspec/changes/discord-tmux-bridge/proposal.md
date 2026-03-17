## Why

目前 Discord 的轉發型指令（/done、/propose、/apply）依賴 cc-connect 的單一 Claude Code session，且 slash bot 的 `[SLASH]` 轉發機制笨重——需要 slash bot 發文字訊息、cc-connect 收到後再餵給 Claude CLI。這導致：
1. 所有專案共用一個 Claude Code session，無法在不同專案間保持獨立上下文
2. 電腦端的 Claude Code 和 cc-connect 必須同時在跑，否則 Discord 端完全無法使用
3. `/propose` 等轉發型指令的回應很慢且不夠絲滑

## What Changes

- 新增 **tmux session 啟動器腳本**（`scripts/discord-session.sh`）：為每個專案在 tmux 中啟動獨立的 Claude Code session，自動 cd 到對應專案目錄，設定 bypass permissions
- 改寫 **cc-connect 架構**：從單一 `[[projects]]` 改為多專案配置，每個專案指向各自的 work_dir，讓 cc-connect 自動路由到正確的 Claude session
- 改寫 **slash bot 轉發機制**：不再用 `[SLASH]` 文字訊息中轉，改為直接在對應的 Claude session 中執行命令（透過 tmux send-keys 或 API）
- 新增 **session 生命週期管理**：自動偵測閒置 session 並清理、防止重複啟動
- 優化 **常用指令**：讓 /progress、/done、/propose、/apply 的回應更快速直接

## Capabilities

### New Capabilities
- `discord-session-launcher`: tmux session 啟動器，負責為每個專案建立/復用獨立的 Claude Code session
- `discord-command-bridge`: 改寫 slash command 的轉發機制，直接橋接到 tmux session 而非透過 `[SLASH]` 中轉

### Modified Capabilities
（無現有 spec 需修改）

## Impact

- **scripts/**：新增 `discord-session.sh` 啟動腳本
- **cc-connect config**：從單專案改為多專案配置（`~/.cc-connect/config.toml`）
- **server/src/discord-bot/**：改寫 forward.ts 的轉發邏輯、可能新增 session 管理 API
- **start.sh / stop.sh**：整合 Discord session 的啟停
- **CLAUDE.md**：移除 `[SLASH]` 前綴解析規則（不再需要）
