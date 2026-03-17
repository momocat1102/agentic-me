## Why

工具監控（Tool Usage Tracking）功能目前沒有帶來實際價值——收集的數據很少被查看，頁面也未提供有用的洞察。同時系統缺少結構化的 log 追蹤機制，當出現問題時難以快速定位根因。需要移除無用的複雜度，並補上真正需要的可觀測性。

## What Changes

### 移除：工具監控系統
- **BREAKING** 移除 `/agents` 頁面（工具監控 Dashboard 頁面）
- 移除 Server 端 `/api/stats/*` 路由與 `stats.ts` 服務
- 移除 `capability-scanner.ts` 服務（Agent 能力掃描）
- 移除 `ToolUsagePanel.tsx` 元件
- 移除 `cc-tool-usage.sh` PostToolUse Hook 及其 settings.json 配置
- 清理導航列中的「工具監控」連結
- 清理 `api.ts` 中相關型別與 API 呼叫
- 清理 `types/index.ts` 中相關型別定義

### 新增：結構化 Log 追蹤系統
- Server 端新增統一 logging 模組（結構化 JSON log）
- 記錄 API 請求/回應、錯誤、關鍵操作（排程執行、任務回報等）
- Dashboard 新增 Log 檢視頁面，可即時查看與篩選系統 log
- 支援依嚴重度（info/warn/error）、來源模組、時間範圍篩選

## Capabilities

### New Capabilities
- `structured-logging`: Server 端結構化 logging 模組，統一 log 格式與儲存
- `log-viewer`: Dashboard Log 檢視頁面，即時查看與篩選系統 log

### Modified Capabilities
（無需修改現有 spec 層級的行為）

## Impact

- **Server**：移除 `routes/stats.ts`、`services/stats.ts`、`services/capability-scanner.ts`；新增 logging 模組；`index.ts` 需更新路由註冊
- **Dashboard**：移除 `agents/page.tsx`、`ToolUsagePanel.tsx`；新增 log-viewer 頁面；更新導航列
- **Hook**：移除 `cc-tool-usage.sh` 及 settings.json 中的 PostToolUse hook 配置
- **DB**：events 表中的 PostToolUse 記錄可選擇性清理；新增 logs 表
- **API**：移除 `/api/stats/*`，新增 `/api/logs`
- **導航**：「工具監控」替換為「系統 Log」
