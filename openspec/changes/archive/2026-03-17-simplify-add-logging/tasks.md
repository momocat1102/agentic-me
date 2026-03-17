## 1. 移除工具監控系統

- [x] 1.1 移除 `server/src/routes/stats.ts` 和 `server/src/services/stats.ts`
- [x] 1.2 移除 `server/src/services/capability-scanner.ts`
- [x] 1.3 移除 `server/src/index.ts` 中的 statsRouter import 和路由註冊
- [x] 1.4 清理 `server/src/types/index.ts` 中的 ToolUsageStat、AgentUsageSummary、AgentCapabilities 等相關型別
- [x] 1.5 移除 `dashboard/src/app/agents/page.tsx`（整個 agents 頁面目錄）
- [x] 1.6 移除 `dashboard/src/components/ToolUsagePanel.tsx`
- [x] 1.7 清理 `dashboard/src/lib/api.ts` 中的 stats 相關型別和 api.stats 物件
- [x] 1.8 移除 NavHeader.tsx 和 MobileDrawer.tsx 中的「工具監控」導航連結
- [x] 1.9 移除 `~/.claude/hooks/cc-tool-usage.sh` 並清理 `~/.claude/settings.json` 中的 PostToolUse hook 配置
- [x] 1.10 清理 `server/dist/` 中對應的編譯產出檔案

## 2. Server 端 Logging 模組

- [x] 2.1 在 `server/src/db/schema.ts` 新增 `logs` 表（id, level, module, message, data, timestamp）和 timestamp 索引
- [x] 2.2 建立 `server/src/services/logger.ts`，實作 logger.info/warn/error 函數，寫入 logs 表
- [x] 2.3 建立 `server/src/routes/logs.ts`，實作 GET /api/logs（支援 level、module、limit、before 參數）和 DELETE /api/logs（支援 before 參數）
- [x] 2.4 在 `server/src/index.ts` 註冊 logsRouter
- [x] 2.5 在關鍵位置加入 logger 呼叫：server 啟停、排程執行、任務建立/完成、WebSocket 連線、API 錯誤

## 3. Dashboard Log 檢視頁面

- [x] 3.1 在 `dashboard/src/lib/api.ts` 新增 log 相關型別和 api.logs 物件（fetchLogs、deleteLogs）
- [x] 3.2 建立 `dashboard/src/app/logs/page.tsx`：log 列表顯示（表格格式，level 顏色標示）、level/module 篩選下拉選單、展開顯示 data JSON
- [x] 3.3 實作 10 秒自動刷新與新 log 提示
- [x] 3.4 更新 NavHeader.tsx 和 MobileDrawer.tsx，新增「系統 Log」導航連結指向 `/logs`

## 4. 驗證與清理

- [x] 4.1 執行 tsc 確認無型別錯誤
- [x] 4.2 執行 next build 確認 Dashboard 建置成功
- [x] 4.3 啟動 server 並手動測試 GET /api/logs 和 Dashboard /logs 頁面
- [x] 4.4 確認移除的頁面（/agents）不再可存取
