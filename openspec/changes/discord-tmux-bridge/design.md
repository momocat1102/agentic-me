## Context

目前 Discord 對接 Claude Code 的架構：
1. **cc-connect**（Go）：單一 `[[projects]]` 配置，work_dir 指向 `/mnt/d/WorkSpace`，所有頻道共用一個 Claude Code session
2. **Slash bot**（Discord.js）：處理 `/progress`、`/overview` 直接回 Embed；`/done`、`/propose`、`/apply` 透過 `[SLASH]` 文字訊息轉發給 cc-connect
3. **CLAUDE.md 頻道切換**：Claude Code 讀 `CC_SESSION_KEY` 環境變數判斷 channel_id，手動 cd 到對應專案

問題：cc-connect 不支援 per-channel 路由（多專案配置會導致所有專案同時回應）、`[SLASH]` 中轉笨重、session 上下文會互相干擾。

## Goals / Non-Goals

**Goals:**
- 自建 Discord↔Claude 橋接，完全取代 cc-connect
- 每個 Discord 專案頻道對應一個獨立的 Claude Code process
- 所有 Discord 訊息（普通 + slash commands）統一由 Discord.js bot 處理並路由
- 常用指令（/progress、/done、/propose、/apply）在手機端用起來絲滑
- Session 自動持久化（`--continue` 恢復上下文）

**Non-Goals:**
- 不做雲端部署（仍依賴桌面電腦在跑）
- 不新增 Discord bot（仍用老賈）
- 不做串流回覆（先做完整回覆，後續可加串流）

## Decisions

### 1. 自建 bridge 取代 cc-connect

**選擇**：擴展現有的 Discord.js slash bot，新增 `messageCreate` 監聽器處理所有普通訊息，統一路由到 `claude -p`。

**原因**：cc-connect 的 Discord 平台不支援 per-channel `channel_id` 過濾。多專案配置會導致每個專案都開 Gateway 連線並回應所有訊息。自建 bridge 可完全控制路由邏輯。

**替代方案**：
- 多 cc-connect 實例 → 同 token 多 Gateway 連線，Discord 端行為不可控
- cc-connect 單專案 + CLAUDE.md 切換 → 現有方案，所有專案共用一個 session，上下文互相干擾

### 2. 使用 `claude -p` (pipe mode) 處理訊息

**選擇**：每則 Discord 訊息觸發一次 `claude -p --continue --permission-mode bypassPermissions`，在對應專案目錄執行。

**工作方式**：
```bash
echo "user message" | claude -p \
  --continue \
  --permission-mode bypassPermissions \
  2>/dev/null
```

- `cwd` 設為專案目錄（自動載入該專案的 CLAUDE.md）
- `--continue` 恢復該目錄最近一次對話（每個專案目錄獨立）
- stdout 捕捉回覆，發回 Discord

**原因**：`claude -p` 是最可靠的非互動模式，不需要解析 tmux buffer。`--continue` 提供 session 持久化。

**替代方案**：
- tmux send-keys + capture-pane → 需要解析 terminal buffer，容易出錯，難以偵測 Claude 何時完成
- `--input-format stream-json` 持久進程 → 更好的效能但實作複雜度高，作為後續優化

### 3. Per-channel 訊息佇列

**選擇**：每個 channel 維護一個 FIFO 佇列，確保同一 channel 的訊息依序處理（避免同時 spawn 多個 claude -p）。

### 4. Slash commands 分成「查詢型」和「執行型」

**查詢型**（/progress、/overview）：保持現有機制，直接查 CC API 回 Embed。

**執行型**（/done、/propose、/apply）：改為透過 `claude -p` 在對應專案目錄執行，回覆結果發回 Discord。

### 5. 啟動與監控

- start.sh 移除 cc-connect 啟動，只保留 server + slash-bot
- 新增 `scripts/discord-session.sh`：可手動為專案啟動 tmux 互動式 Claude（用於除錯/監控，非必要）
- 所有 Discord↔Claude 通訊透過 slash bot 的 `claude -p` 處理

## Risks / Trade-offs

- **每則訊息啟動新 process**：`claude -p` 每次都 spawn 新進程，有啟動延遲（約 2-5 秒）。→ 可接受，Discord 有 defer 機制。後續可改用持久進程優化。

- **`--continue` 的 session 粒度**：`--continue` 恢復「該目錄最近一次對話」。如果使用者同時在桌面用 Claude，可能衝突。→ 用 `--session-id` 指定 Discord 專用 session ID 可避免。

- **長回覆截斷**：Discord 訊息限制 2000 字元。Claude 回覆可能更長。→ 需要分段發送或截斷。

- **資源消耗**：每則訊息一個 Claude process，但用完即釋放。比 cc-connect 的常駐 process 更省資源。
