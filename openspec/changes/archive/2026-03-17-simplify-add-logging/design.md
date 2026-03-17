## Context

Central Command 目前有一套工具監控系統（PostToolUse Hook → events 表 → /api/stats → /agents 頁面），追蹤每個 Agent 使用了哪些工具。實際運行後發現這些數據很少被查看，且不提供實際的除錯價值。同時系統內所有 log 都是散落的 `console.log`，沒有統一格式，出問題時需要逐行翻 terminal 輸出。

## Goals / Non-Goals

**Goals:**
- 完全移除工具監控相關程式碼與配置，減少系統複雜度
- 新增結構化 logging 模組，所有 server 端操作都有統一格式的 log
- 提供 Dashboard 頁面讓使用者可以查看、篩選系統 log
- log 存入 SQLite，方便查詢和保留歷史

**Non-Goals:**
- 不做外部 log 服務整合（如 Loki、ElasticSearch）
- 不做 log alerting 或自動告警
- 不修改 events 表本身（其他事件類型可能仍在使用）
- 不做 log rotation 或自動清理（初版手動管理）

## Decisions

### 1. Logging 儲存方式：SQLite `logs` 表

**選擇**：直接存入 SQLite，與現有 DB 共用。

**理由**：系統已使用 SQLite，無需引入額外依賴。log 量預期不大（server 端操作 log），SQLite 完全足夠。

**替代方案**：
- 檔案 log（winston/pino → .log 檔）：需額外 rotation，查詢不方便
- 外部服務（Loki）：過度設計，單人系統不需要

### 2. Logger 模組設計：簡單函數式 API

**選擇**：提供 `logger.info/warn/error(module, message, data?)` 函數。

**理由**：直接替換 `console.log`，學習成本為零。不需要 class instance 或 dependency injection。

### 3. Log 結構

每條 log 包含：
- `id`: UUID
- `level`: 'info' | 'warn' | 'error'
- `module`: 來源模組名稱（如 'scheduler', 'tasks', 'agents'）
- `message`: 人類可讀訊息
- `data`: 可選 JSON，附帶結構化資料
- `timestamp`: ISO 8601

### 4. Dashboard Log 頁面

**選擇**：替換原本的 `/agents`（工具監控）導航位置，新頁面放在 `/logs`。

**理由**：導航位置有限，移除舊頁面後直接放入新頁面，保持導航簡潔。

### 5. 移除範圍確認

移除時保留 `events` 表和 `/api/events` 路由（Agent 活動偵測仍在使用），只移除 `/api/stats` 和相關 stats 服務。`usage_billing` 表和 `/api/usage` 路由也是獨立功能，不在此次移除範圍。

## Risks / Trade-offs

- **[Log 表膨脹]** → 初版不做自動清理，但 API 支援 `before` 參數可手動刪除舊 log。未來可加 retention policy。
- **[遷移風險]** → 純新增表 + 刪除程式碼，無資料遷移需求，風險極低。
- **[Hook 移除]** → 移除 PostToolUse hook 後，若未來需要工具追蹤，需重新實作。目前判斷不需要。
