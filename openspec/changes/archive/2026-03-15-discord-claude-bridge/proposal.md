## Why

目前 Agentic Me 系統只能透過本機終端機操作 Claude Code，使用者離開電腦後完全無法與系統互動。透過 Discord Bot 作為遠端介面，使用者可以在手機上發送指令、查看進度、觸發任務，實現隨時隨地管理專案的能力。

## What Changes

- 新增 Discord Bot 服務，作為 Claude Code CLI 的遠端代理
- Bot 接收 Discord 訊息 → 轉發給本機 Claude Code CLI（透過 `claude -p` 非互動模式）→ 將結果回傳 Discord
- 整合 Central Command API，支援快速查詢 Agent 狀態、任務歷史、專案進度
- 支援長時間任務的非同步執行與結果通知
- 透過 Discord thread 隔離不同專案/任務的對話

## Capabilities

### New Capabilities
- `discord-bot-core`: Discord Bot 連線、指令路由、訊息收發、權限管控（限定使用者）
- `claude-cli-bridge`: 將 Discord 訊息轉譯為 claude CLI 呼叫，管理執行生命週期（啟動、超時、取消）
- `cc-query-commands`: 透過 Central Command API 提供快速查詢指令（/status, /tasks, /projects）
- `async-task-runner`: 長時間任務的背景執行與完成通知機制

### Modified Capabilities
（無需修改現有 spec）

## Impact

- **新增依賴**：discord.js（Discord Bot SDK）
- **新增服務**：Discord Bot process，需隨 Central Command 一起啟動
- **Server 影響**：無需修改現有 API，Bot 作為 API consumer
- **安全性**：Bot 僅允許指定 Discord User ID 操作，防止未授權存取
- **基礎設施**：需要 Discord Bot Token（透過 Discord Developer Portal 建立）
- **啟動流程**：start.sh 需加入 Bot 啟動邏輯
