# Discord Bot 設定指南（cc-connect 用）

## 1. 建立 Discord Application

1. 前往 https://discord.com/developers/applications
2. 點擊 "New Application"
3. 命名為 `cc-connect`（或任意名稱），點 Create

## 2. 建立 Bot 並取得 Token

1. 左側選 **Bot**
2. 點 "Reset Token"（可能需要 2FA）
3. **立刻複製 Token** — 只顯示一次
4. Token 格式：`MTk4NjIyNDgzNDcOTY3NDUxMg.G8vKqh.xxx...`

## 3. 開啟 Privileged Intents（必要！）

在 Bot 頁面 → "Privileged Gateway Intents"：

- **Message Content Intent** → 開啟（必要，否則 bot 讀不到訊息）
- Presence Intent → 選用
- Server Members Intent → 選用

## 4. 產生邀請連結

1. 左側 **OAuth2** → **URL Generator**
2. Scopes 勾選：`bot` + `applications.commands`
3. Bot Permissions 勾選：
   - Read Messages/View Channels
   - Send Messages
   - Create Public Threads
   - Send Messages in Threads
   - Read Message History
4. 複製底部產生的 URL

## 5. 邀請 Bot 到你的 Server

1. 在瀏覽器貼上邀請 URL
2. 選擇要加入的 Discord Server
3. 點授權

## 6. 取得你的 User ID 和 Guild ID

**User ID**：
1. Discord 設定 → 進階 → 開啟「開發者模式」
2. 右鍵點自己的頭像 → Copy User ID

**Guild ID**（Server ID）：
1. 右鍵點 Server 名稱 → Copy Server ID

## 7. 設定 cc-connect

把 Token、User ID、Guild ID 填入 `~/.cc-connect/config.toml`（見 config.toml 設定檔）。

## 注意事項

- 全域 slash command 最多需 1 小時生效 — 設定 `guild_id` 可秒級生效（推薦測試階段使用）
- 個人使用建議 `mode = "bypassPermissions"`，免得每次都要在聊天裡回覆「允許」
- `allow_from` 設定你的 User ID 而非 `"*"`，防止他人操控
