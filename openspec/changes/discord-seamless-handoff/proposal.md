## Why

桌面 Claude Code 和手機 Discord 目前是斷裂的兩個世界。在電腦上做了一堆工作後切到手機 Discord，Discord bot 完全不知道剛才發生了什麼——使用者必須重新描述上下文，無法「接著做」。反之，在 Discord 上討論的決策和進度也不會回流到桌面工作環境。Central Command 已經有完整的任務/進度追蹤資料，但這些資訊沒有流向 Discord，導致跨裝置體驗斷裂。

## What Changes

- **事件推播到 Discord**：當桌面完成任務、更新進度、或有重要事件時，Central Command 自動推送摘要到對應的 Discord 頻道
- **Discord 上下文注入**：Discord bot session 啟動時，自動從 Central Command 拉取該專案的最近活動和進度，注入為對話上下文
- **Discord Slash Commands**：註冊 Discord 原生 slash commands（`/progress`、`/done`、`/propose`、`/apply`），手機打 `/` 即有自動補全選單，執行後透過 CC API 直接查詢或轉發給 cc-connect 執行
- **跨裝置接續指令**：在 Discord 上可以用簡單指令查詢「剛才做了什麼」、「目前進度」，快速接續桌面工作
- **雙向狀態同步**：Discord 上完成的工作（任務回報、決策記錄）也同步回 Central Command

## Capabilities

### New Capabilities
- `discord-event-push`: Central Command 偵測到關鍵事件（任務完成、進度更新、夜班報告）時，透過 Discord webhook 推送通知到對應頻道
- `discord-context-bridge`: Discord bot session 啟動時自動注入近期專案活動摘要，讓手機端延續桌面上下文
- `handoff-query`: 在 Discord 上查詢跨裝置工作狀態的能力（最近任務、當前進度、未完成項目）
- `discord-slash-commands`: 註冊 Discord 原生 Application Commands，提供 /progress、/done、/propose、/apply 四個 slash commands，手機操作友善

### Modified Capabilities

## Impact

- **Server**：新增 Discord webhook 推播 route 和事件監聽邏輯（`server/src/routes/` 和 `server/src/services/`）
- **Discord 設定**：需要在 Discord server 設定 webhook URL，或使用 bot token 直接發訊息
- **CLAUDE.md**：更新 `/mnt/d/WorkSpace/CLAUDE.md` 的 Discord 頻道切換邏輯，加入上下文注入步驟
- **Hooks**：可能需要新增或修改 stop hook，在任務完成時觸發推播
- **cc-connect**：可能需要調整 cc-connect 的 config 或使用其 API
- **依賴**：Discord.js（gateway 連線 + slash command 註冊 + interaction 處理）
- **新服務**：獨立的 Discord slash command bot（與 cc-connect 共存，使用不同 bot token），在 start.sh 中一起啟動
