## 1. Discord Webhook 基礎設施

- [x] 1.1 在 DB schema 新增 `discord_webhooks` 表（project TEXT PRIMARY KEY, webhook_url TEXT, created_at TEXT）
- [x] 1.2 建立 `server/src/routes/discord-webhooks.ts`：CRUD API（POST/GET/DELETE /api/discord-webhooks）
- [x] 1.3 在 server index 註冊 discord-webhooks router
- [x] 1.4 建立 `server/src/services/discord-notifier.ts`：封裝 Discord Webhook POST 邏輯（Embed 格式、錯誤處理、throttle 機制）

## 2. 事件推播整合

- [x] 2.1 在 `tasks.ts` 的 POST handler 加入 discordNotify 呼叫（task_recorded 事件）
- [x] 2.2 在 `progress.ts` 的 POST/PUT handler 加入 discordNotify 呼叫（progress_update 事件）
- [x] 2.3 在 `schedules.ts` 的 report-round handler 加入 discordNotify 呼叫（night_shift_report 事件）
- [x] 2.4 實作 throttle 邏輯：同一專案 5 分鐘內最多 3 則通知

## 3. Handoff API

- [x] 3.1 在 `server/src/routes/projects.ts` 新增 `GET /api/projects/:id/handoff` endpoint
- [x] 3.2 實作 handoff 資料聚合：最近 5 筆 tasks + 未完成 progress + 最後活動時間 + 一行摘要

## 4. Discord Slash Command Bot

- [x] 4.1 使用現有老賈 bot（同一 token 雙 gateway 連線：cc-connect 收訊息、Discord.js 收 interactions）
- [x] 4.2 建立 `server/src/discord-bot/` 目錄結構：index.ts、commands/、channel-map.json
- [x] 4.3 實作 bot 啟動邏輯：Discord.js Client 連線 + slash command 註冊（progress、done、propose、apply、overview）
- [x] 4.4 建立 channel-map.json：從 CLAUDE.md 的頻道對應表轉為 JSON 格式（channel_id → project name）
- [x] 4.5 實作「直接回應型」commands：/progress 和 /overview（查 CC API → 回覆 Embed）
- [x] 4.6 實作「轉發執行型」commands：/done、/propose、/apply（ephemeral 回覆 + channel.send [SLASH] 訊息）
- [x] 4.7 在 package.json 加入 discord.js 依賴和 `dev:discord-bot` script
- [x] 4.8 更新 start.sh：在 tmux 新增 window 啟動 discord slash bot

## 5. Discord 上下文注入

- [x] 5.1 更新 `/mnt/d/WorkSpace/CLAUDE.md`：在「第一則訊息時必做」加入呼叫 handoff API 的步驟
- [x] 5.2 在 CLAUDE.md 加入 `[SLASH]` 前綴訊息的解析規則（將 `[SLASH] /done ...` 轉為對應 skill 呼叫）
- [x] 5.3 定義上下文注入的格式模板（自然語言、相對時間、bullet points）

## 6. 設定與測試

- [ ] 6.1 為每個已有的 Discord 頻道建立對應的 webhook（透過 Discord 後台），用 API 註冊到 CC
- [ ] 6.2 端對端測試：桌面完成任務 → Discord 收到推播
- [ ] 6.3 端對端測試：Discord 打 /progress → 收到專案進度 Embed
- [ ] 6.4 端對端測試：Discord 打 /done → cc-connect 接收並由 Claude Code 處理
- [ ] 6.5 端對端測試：Discord 開啟對話 → 自動帶入最近活動上下文
