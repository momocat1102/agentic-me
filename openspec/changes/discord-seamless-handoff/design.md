## Context

目前 Agentic Me 系統有兩個互動介面：
1. **桌面 Claude Code**：直接在 terminal/VS Code 操作，透過 Central Command API 追蹤任務與進度
2. **手機 Discord**：透過 cc-connect bot 連線，每個頻道對應一個專案（定義在 `/mnt/d/WorkSpace/CLAUDE.md`）

問題：兩端完全獨立。桌面完成任務後，Discord 端完全不知道發生了什麼。切到手機時使用者要重新說明上下文。

現有基礎設施：
- Central Command server (port 4000) 已有 `/api/tasks`、`/api/progress`、`/api/events` 等 API
- WebSocket broadcaster (`broadcast()`) 已在任務/進度更新時廣播事件
- cc-connect 用 bot token 連接 Discord，`group_reply_all` 模式
- 頻道→專案的對應關係已定義在 CLAUDE.md 中

## Goals / Non-Goals

**Goals:**
- 桌面完成重要工作時，對應的 Discord 頻道收到摘要通知
- 在 Discord 開始對話時，自動帶入該專案的最近活動上下文
- 使用者可在 Discord 快速查詢「剛才做了什麼」
- 提供 Discord 原生 slash commands（/progress、/done、/propose、/apply），手機打 `/` 即有補全選單

**Non-Goals:**
- 不做即時雙向聊天同步（桌面↔Discord 對話串同步）
- 不改動 cc-connect 的核心程式碼（只透過設定和 CLAUDE.md 控制行為）
- 不需要即時串流（推播延遲幾秒可接受）

## Decisions

### 1. 推播方式：Discord Webhook（而非 bot API）

**選擇**：Central Command server 透過 Discord Webhook URL 推送訊息到頻道

**替代方案**：
- 用 cc-connect 的 bot token 直接 POST `/channels/:id/messages` → 需要額外權限管理，且 bot 同時讀寫同一頻道可能有衝突
- 讓 cc-connect 內建推播 → 需要改 cc-connect 原始碼，維護成本高

**理由**：Webhook 是 Discord 官方推薦的「外部系統推播」機制，不需要 bot 權限，每個頻道獨立設定，server 端只需要一個 HTTP POST。

### 2. 事件監聽點：WebSocket broadcaster 攔截

**選擇**：在現有的 `broadcast()` 函數旁新增一個 `discordNotify()` 呼叫，監聽 `task_recorded`、`progress_update` 等事件

**替代方案**：
- 用 hook（stop hook）在 Claude 端 curl 推播 → 太依賴 hook 正確設定，且格式不一致
- 輪詢 API → 浪費資源，延遲高

**理由**：server 已經有事件廣播機制，在同一處加上 Discord webhook 呼叫最自然，確保所有來源（MCP、API、hook）的事件都能被捕捉。

### 3. 上下文注入：修改 CLAUDE.md 指引

**選擇**：在 `/mnt/d/WorkSpace/CLAUDE.md` 的「第一則訊息時必做」步驟中，加入「呼叫 CC API 取得最近活動」

**替代方案**：
- 建一個獨立 MCP tool → 過度設計，CLAUDE.md 指引就夠了
- 讓 cc-connect 自動注入 system prompt → cc-connect 不支援動態 system prompt

**理由**：CLAUDE.md 已經控制 Discord bot 行為，加一步 `curl` 拉取活動最簡單有效。

### 4. 頻道→Webhook 映射：設定檔 + API 管理

**選擇**：在 CC server 加一張 `discord_webhooks` 表，存放 project→webhook_url 對應，提供 CRUD API

**替代方案**：
- 寫在 config.toml → server 端讀不到 cc-connect 的設定
- 環境變數 → 不好管理多個頻道

**理由**：讓 server 自己管理 webhook 設定，未來可以在 Dashboard 上設定。

### 5. Slash Commands：獨立 Discord.js Bot

**選擇**：建立一個獨立的 Discord.js bot（使用新的 bot application），專門處理 slash commands，與 cc-connect 共存

**替代方案**：
- 用 cc-connect 同一個 bot token 註冊 slash commands → cc-connect 的 gateway 連線不處理 interaction events，會收不到回應
- 改寫 cc-connect → 維護成本太高，且 cc-connect 是外部 Go binary
- 用 HTTP interaction endpoint → 需要公開 HTTPS URL，local dev 不實際

**理由**：
- Discord 允許同一 server 有多個 bot，互不干擾
- 新 bot 只做 slash command，不讀一般訊息，不會跟 cc-connect 衝突
- Discord.js v14 原生支援 slash command 註冊 + interaction 處理
- 分工明確：cc-connect = 聊天對話、slash-bot = 快捷指令

**Slash Command 分類**：
- **直接回應型**（bot 自行回應，不經過 Claude Code）：
  - `/progress [project]`：查 CC API，直接回覆 Embed
  - `/overview`：查 CC API，回覆所有專案摘要
- **轉發執行型**（需要 Claude Code 處理）：
  - `/done [summary]`：bot 在頻道發一條格式化訊息（如 `[SLASH] /done: ...`），cc-connect 接收後轉給 Claude Code 執行
  - `/propose [name] [description]`：同上轉發模式
  - `/apply [change-name]`：同上轉發模式

**轉發機制**：slash bot 用 `channel.send()` 發送帶有 `[SLASH]` 前綴的訊息，cc-connect 的 `group_reply_all` 會自動接收並轉發給 Claude Code。CLAUDE.md 中加入對 `[SLASH]` 前綴的解析規則。

### 6. 推播內容格式：Discord Embed

**選擇**：用 Discord Embed 格式，包含標題、專案名、摘要、時間戳

**理由**：Embed 在手機上顯示效果好，結構清晰，支援顏色區分不同類型的事件。

## Risks / Trade-offs

- **[Webhook URL 洩漏]** → Webhook URL 存在 DB 中，不暴露在前端 API（或用 mask 顯示）。刪除 webhook 可透過 Discord 後台撤銷。
- **[推播太頻繁]** → 加入節流機制：同一專案 5 分鐘內最多推 3 則，超過則合併。
- **[cc-connect 與 webhook 訊息衝突]** → Webhook 訊息用不同的 username/avatar（如「CC Notify」），與 bot 訊息視覺區分。
- **[CLAUDE.md 指引可能被忽略]** → 用「必做」強調，並放在步驟最前面。
- **[API 呼叫失敗]** → 推播失敗只 log warning，不影響主流程。上下文注入失敗也 graceful fallback。
- **[兩個 bot 共存]** → slash bot 不監聽 message events（只處理 interaction），不會重複回應。cc-connect 忽略 bot 發的訊息（Discord bot flag）。需測試 cc-connect 是否會回應 slash bot 的 channel.send()——如果會，改用 webhook 發訊息。
- **[slash bot 需要新 Application]** → 在 Discord Developer Portal 建立第二個 Application，邀請到同一 server。需額外管理一組 bot token。
- **[轉發型命令的 UX]** → 使用者按 /done 後，slash bot 先回覆 ephemeral message「已轉發給 Claude Code 處理中...」，然後在頻道發轉發訊息。Claude Code 的回覆由 cc-connect 正常送出。
