## Why

memcp 目前的記憶管理依賴簡單的線性衰減和 hash 去重，無法精確區分記憶的生命週期階段，也無法智慧處理事實更新、矛盾或多方印證等複雜情境。借鑑 memory-lancedb-pro 的認知科學設計模式（Weibull 衰減、七種去重決策、L0/L1/L2 分層），可以大幅提升記憶的準確度和檢索品質。使用者願意投入少量 LLM 額度（Claude API，已包含在現有訂閱中）來換取更智慧的記憶處理，但不接受任何額外付費的外部服務。

## What Changes

- **Weibull 三層衰減引擎**：取代現有的線性半衰期衰減，引入 Peripheral/Working/Core 三層記憶分級，每層使用不同的 Weibull beta 參數模擬認知科學遺忘曲線
- **七種去重決策系統**：取代現有的 hash + 語義去重，新增 CREATE/MERGE/SKIP/SUPERSEDE/SUPPORT/CONTEXTUALIZE/CONTRADICT 七種決策，由 LLM 裁決（使用 Claude API）
- **事實版本鏈（SUPERSEDE）**：記憶更新時保留舊版本並建立版本鏈，可追溯知識演變歷史
- **L0/L1/L2 分層儲存**：為每條記憶生成一句話索引（L0）+ 結構化摘要（L1）+ 完整內容（L2），搜尋時只比對 L0 提升效率
- **存取強化改進**：存取次數加入時間衰減，區分手動 recall 和自動 recall 的強化效果
- **搜尋管線調校**：加入長度正規化、BM25 高信度保護、CJK 自適應檢索閾值、新近度加成（加法型）、MMR 多樣性去重
- **跨專案記憶存取（agentAccess）**：新增 `~/.memcp/access.json` 配置檔，允許在 A 專案查詢時存取 B 專案的記憶，搜尋結果標注來源專案

## Capabilities

### New Capabilities
- `weibull-decay`: Weibull 三層衰減引擎，含 tier 晉升/降級邏輯和複合評分公式
- `smart-dedup`: LLM 驅動的七種去重決策系統，含事實版本鏈和證據強度追蹤
- `layered-storage`: L0/L1/L2 分層儲存結構，含自動摘要生成和分層檢索
- `cross-project-access`: 跨專案記憶存取配置，含 agentAccess config 和來源標注

### Modified Capabilities

## Impact

- **核心模組**：`core/node_store.py`（schema 新增 tier/l0/l1/supersede 欄位）、`core/graph_traversal.py`（衰減公式重寫）、`core/search.py`（管線調校）、`core/consolidation.py`（去重決策重寫）
- **DB 遷移**：SQLite graph.db 需新增欄位（tier, l0_abstract, l1_overview, superseded_by, supersedes, support_count, valid_from, invalidated_at），需向後相容遷移
- **LLM 依賴**：去重決策和 L0/L1 生成需呼叫 Claude API，透過 MCP 或直接 HTTP 呼叫，使用者現有 Claude 訂閱額度
- **MCP Tools**：現有 24 個 tools 介面不變，`memcp_remember` 內部流程增加去重裁決步驟，`memcp_recall` 增加 tier 強化邏輯。`memcp_recall` 和 `memcp_search` 的查詢範圍擴展為包含 access.json 中授權的跨專案記憶
- **向後相容**：所有新欄位 nullable，現有記憶自動歸類為 Working tier，LLM 去重可透過環境變數 `MEMCP_SMART_DEDUP=true` 開關
