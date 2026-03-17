## Context

Agentic Me 系統目前僅能透過本機終端操作。Central Command 已有完整的 REST API（port 4000）和 WebSocket（port 4001），但缺乏遠端存取介面。使用者希望在手機上透過 Discord 與系統互動，包括發送 Claude Code 指令和查詢專案狀態。

現有架構：
- Server：Hono + SQLite，提供 agents/tasks/projects/schedules API
- Dashboard：Next.js，透過 WebSocket 接收即時更新
- Claude CLI：`claude -p "prompt" --output-format text --dangerously-skip-permissions` 支援非互動模式

## Goals / Non-Goals

**Goals:**
- 透過 Discord Bot 在手機上發送自然語言指令給 Claude Code
- 快速查詢 Agent 狀態、專案進度、任務歷史（透過 CC API）
- 支援長時間任務的背景執行與完成通知
- 僅限指定使用者操作（安全性）

**Non-Goals:**
- 不做完整的對話式 AI（Discord 是指令代理，不是聊天機器人）
- 不支援多使用者協作
- 不在 Discord 上做檔案編輯的即時預覽
- 不修改現有 Central Command API
- 暫不支援 Telegram（未來可擴充）

## Decisions

### 1. Bot 架構：獨立 Node.js 服務

**選擇**：Bot 作為獨立 process，與 Central Command server 分離。

**替代方案**：
- 整合進 Central Command server → 增加耦合，server 重啟會斷 Bot 連線
- 獨立 Python 服務 → 生態系不一致，團隊維護成本高

**理由**：Bot 是 API consumer，不需要存取 DB。獨立 process 允許獨立重啟，且可共用 TypeScript 生態系。

### 2. Claude CLI 呼叫方式：child_process.spawn

**選擇**：使用 Node.js `child_process.spawn` 呼叫 `claude -p`。

**替代方案**：
- Claude API 直接呼叫 → 失去 Claude Code 的工具存取能力（Read/Write/Bash/MCP 等）
- WebSocket 連接到運行中的 Claude session → Claude Code 不支援外部 WebSocket 控制

**理由**：`claude -p` 是官方非互動模式，能存取所有 Claude Code 工具和 MCP server，且支援 `--max-budget-usd` 限制花費。

### 3. 任務執行模式：同步短任務 + 非同步長任務

**選擇**：
- 預估 < 30 秒的查詢/簡單操作 → 同步等待回應
- 長時間任務 → 背景執行，完成後 Discord 通知

**理由**：Discord 有互動回應 3 秒 timeout（可 defer 到 15 分鐘），但使用者體驗上不應讓手機一直等。超過閾值自動切換為非同步模式。

### 4. 對話隔離：Discord Thread

**選擇**：每個 Claude CLI 呼叫在 Discord thread 中隔離。

**理由**：避免頻道被大量輸出洗版，thread 提供自然的對話分組。

### 5. 訊息格式化：Markdown → Discord 格式

**選擇**：Claude 輸出的 Markdown 轉換為 Discord 支援的格式（code block, bold, embed）。

**理由**：Discord 支援有限的 Markdown，長輸出需要分段（2000 字元限制）或使用 embed。超長輸出上傳為 .txt 附件。

### 6. 專案工作目錄：指令指定

**選擇**：使用者透過 `/project <name>` 指令設定工作目錄，後續指令在該目錄下執行。Bot 從 CC API 查詢已註冊專案的路徑。

**理由**：避免每次都要指定完整路徑，且與 Central Command 專案管理整合。

## Risks / Trade-offs

- **[安全風險] Claude CLI 有完整檔案系統存取權** → 使用 `--dangerously-skip-permissions` 是必要的（非互動模式需要），透過限制 Discord User ID + `--max-budget-usd` 降低風險
- **[穩定性] Claude CLI spawn 可能 hang 或 OOM** → 設定 timeout（預設 5 分鐘），超時自動 kill child process
- **[訊息限制] Discord 2000 字元限制** → 長輸出分段發送或上傳為檔案附件
- **[延遲] Claude CLI 冷啟動需要數秒** → 短查詢走 CC API 直接回應，只有需要 Claude 時才 spawn
- **[並行] 同時多個 Claude 指令可能衝突** → 使用佇列限制同時執行數（預設 1），排隊中的任務顯示位置

## Open Questions

- Discord Bot Token 的安全儲存方式（.env vs 系統 keychain）
- 是否需要支援 Discord slash commands（/ask, /status）還是純文字訊息觸發
- 長輸出的最佳呈現方式（分段 vs 附件 vs embed）
