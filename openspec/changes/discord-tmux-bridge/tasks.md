## 1. Claude Bridge 核心模組

- [x] 1.1 建立 `server/src/discord-bot/claude-bridge.ts`：封裝 `claude -p` 呼叫邏輯（spawn process、cwd 設定、stdout 捕捉、錯誤處理）
- [x] 1.2 加入 per-channel 訊息佇列：同一 channel 的訊息依序處理，避免並發 spawn
- [x] 1.3 加入 Discord 2000 字元限制處理：長回覆自動分段發送

## 2. 訊息監聽與路由

- [x] 2.1 在 `server/src/discord-bot/index.ts` 新增 `GuildMessages` + `MessageContent` intents
- [x] 2.2 新增 `messageCreate` 事件處理：根據 channel-map.json 路由到對應專案目錄，呼叫 claude-bridge
- [x] 2.3 加入 bot 自身訊息過濾（忽略 bot 發的訊息）、typing indicator

## 3. Slash commands 改寫

- [x] 3.1 改寫 `forward.ts`：執行型指令（/done、/propose、/apply）改用 claude-bridge 直接執行，不再用 `[SLASH]` channel.send
- [x] 3.2 更新 ephemeral 回覆：顯示「正在處理...」，完成後 editReply 或 followUp 顯示結果

## 4. 啟停整合

- [x] 4.1 更新 `start.sh`：移除 cc-connect 啟動區塊，改為單一 Discord Bridge Bot
- [x] 4.2 更新 `stop.sh`：移除 cc-connect 相關清理
- [x] 4.3 建立 `scripts/discord-session.sh`（可選）：手動為專案啟動 tmux 互動式 Claude session，用於除錯監控

## 5. 清理舊機制

- [x] 5.1 移除 `/mnt/d/WorkSpace/CLAUDE.md` 中的 `[SLASH] 訊息處理` 區塊
- [x] 5.2 移除 `/mnt/d/WorkSpace/CLAUDE.md` 中的 `CC_SESSION_KEY` 頻道切換邏輯和「第一則訊息時必做」步驟
- [x] 5.3 簡化 CLAUDE.md：保留基本的 Discord 互動規則（用繁體中文、簡潔回覆）

## 6. 端對端測試

- [x] 6.1 測試：Discord 普通訊息 → claude-bridge → 正確專案 Claude 回覆（#system-agent 和 #master-thesis 均成功）
- [ ] 6.2 測試：/done slash command → claude-bridge 執行 /done → 結果回傳 Discord
- [ ] 6.3 測試：/progress → 直接查 CC API（不受影響）
- [x] 6.4 測試：restart.sh 完整流程（server + slash bot，不再有 cc-connect）
