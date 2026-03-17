## 1. DB 遷移與基礎設施

- [x] 1.1 在 `core/node_store.py` 的 `_init_db()` 中新增 9 個欄位的 ALTER TABLE 遷移（tier, l0_abstract, l1_overview, superseded_by, supersedes, support_count, valid_from, invalidated_at, auto_access_count），使用現有的 safe add column 模式
- [x] 1.2 在 `config.py` 新增所有環境變數配置：`MEMCP_SMART_DEDUP`、`MEMCP_LAYERED_STORAGE`、`MEMCP_DEDUP_MODEL`、`MEMCP_DECAY_HALF_LIFE`、`MEMCP_DECAY_MU`、`MEMCP_DECAY_MAX_MULTIPLIER`、`MEMCP_DECAY_BETA_PERIPHERAL/WORKING/CORE`、`MEMCP_RECENCY_HALF_LIFE`、`MEMCP_RECENCY_WEIGHT`、`MEMCP_MMR_THRESHOLD`
- [x] 1.3 在 `pyproject.toml` 新增 `anthropic` SDK 為可選依賴（`pip install memcp[llm]`），並在程式碼中做 availability check

## 2. Weibull 衰減引擎

- [x] 2.1 新增 `core/decay.py` 模組：實作 `WeibullDecayEngine` 類，包含 `compute_recency(days, beta, importance_value)` 和 `compute_composite_score(memory)` 方法
- [x] 2.2 實作 `TierManager` 類：`evaluate_transition(memory) -> Optional[TierTransition]`，包含晉升（P→W、W→C）和降級（W→P、C→W）邏輯
- [x] 2.3 修改 `memory.py:_compute_effective_importance()` 使用 `WeibullDecayEngine`，取代現有的 `0.5^(days/30)` 公式
- [x] 2.4 在 `memcp_recall` 流程（`core/memory.py` 或 `tools/`）中加入 tier 評估：recall 返回結果後呼叫 `TierManager.evaluate_transition()`，有變更時更新 DB

## 3. LLM 整合層

- [x] 3.1 新增 `core/llm.py` 模組：封裝 Anthropic SDK 呼叫，包含 `call_claude(prompt, model) -> str`，處理 API key 檢查、超時、錯誤回退
- [x] 3.2 設計去重 prompt 模板：輸入為新記憶 + top 3 候選，輸出為 JSON `{decision, match_index, reason, l0_abstract, l1_overview}`，限制 <500 tokens input
- [x] 3.3 設計純摘要 prompt 模板（當 smart_dedup=false 但 layered_storage=true 時使用）：輸入為記憶內容，輸出為 JSON `{l0_abstract, l1_overview}`

## 4. 七種去重決策系統

- [x] 4.1 新增 `core/smart_dedup.py` 模組：實作 `SmartDedup` 類，包含 `evaluate(new_content, candidates) -> DedupDecision` 方法
- [x] 4.2 實作 CREATE/SKIP/MERGE 三個基本決策的執行邏輯（MERGE 複用現有 `consolidation.py:merge_group()` 邏輯）
- [x] 4.3 實作 SUPERSEDE 決策：建立版本鏈（設定 old.invalidated_at、old.superseded_by、new.supersedes），在搜尋中排除 invalidated 記憶
- [x] 4.4 實作 SUPPORT 決策：遞增 existing.support_count，在搜尋排序中加入 support_count 正向權重
- [x] 4.5 實作 CONTEXTUALIZE 決策：建立新記憶 + entity 邊連結原記憶
- [x] 4.6 實作 CONTRADICT 決策：保留兩者 + 建立 causal 邊（metadata 含 `{"relation": "contradicts"}`）
- [x] 4.7 修改 `core/memory.py:remember()` 流程：在現有 hash 去重之後、插入之前，加入 smart dedup pipeline（feature flag 控制）

## 5. L0/L1 分層儲存

- [x] 5.1 修改 `core/memory.py:remember()` 流程：在 smart dedup LLM 呼叫後解析 L0/L1 並存入 DB（或單獨呼叫 LLM）
- [x] 5.2 修改 `core/search.py` 的搜尋邏輯：當 `l0_abstract` 非空時，BM25 和語義搜尋優先比對 L0 而非 content
- [x] 5.3 修改 `tools/` 中 recall 的回傳格式：在結果中包含 l0_abstract 和 l1_overview（若有值）

## 6. 存取強化改進

- [x] 6.1 修改 `_compute_effective_importance()` 中的 access_boost：`decayed_count = access_count × exp(-days_since_last / 30)`，使用 `log1p(decayed_count)` 計算 boost
- [x] 6.2 區分手動/自動存取：`memcp_recall` 工具遞增 `access_count`，內部操作（consolidation_preview、retention_preview 等）遞增 `auto_access_count`

## 7. 搜尋管線調校

- [x] 7.1 在 `core/search.py` 新增長度正規化後處理：`factor = 1 / (1 + 0.5 × log2(len / 500))`，短於 500 字不懲罰
- [x] 7.2 新增 BM25 高信度保護：fused score 不低於 `bm25_score × 0.92`（當 bm25_score >= 0.75）
- [x] 7.3 新增 CJK 自適應搜尋閾值：偵測 CJK 字元時最低長度從 15 降到 6，含 `?` 的查詢跳過長度檢查
- [x] 7.4 在搜尋排序中加入 support_count 正向加成和 superseded 排除邏輯
- [x] 7.5 新增新近度加成（加法型）：`boost = exp(-age_days / 14) × 0.10`，clamp 到 [0, 1]，配置 `MEMCP_RECENCY_HALF_LIFE` 和 `MEMCP_RECENCY_WEIGHT`
- [x] 7.6 新增 MMR 多樣性去重：cosine similarity > 0.85 的結果延後而非刪除，僅在語義嵌入可用時啟用，配置 `MEMCP_MMR_THRESHOLD`

## 8. 跨專案記憶存取

- [x] 8.1 實作 `core/access.py` 模組：讀取 `~/.memcp/access.json`，提供 `get_accessible_projects(current_project) -> list[str]` 方法，支援 `"*"` 萬用字元，檔案不存在時回傳空列表
- [x] 8.2 修改 `core/search.py` 和 `core/graph_traversal.py` 的查詢邏輯：SQL WHERE 條件從 `IN (current, '_global')` 擴展為 `IN (current, '_global', ...accessible)`
- [x] 8.3 在搜尋結果中加入 `source_project` 欄位標注記憶來源
- [x] 8.4 新增 MCP tool `memcp_access_config`：支援 view/grant/revoke 三種操作，讀寫 access.json
- [x] 8.5 在 `server.py` 註冊 `memcp_access_config` tool 並加入 permissions

## 9. 測試

- [x] 9.1 為 `core/decay.py` 撰寫單元測試：Weibull 衰減公式、tier 晉升/降級條件、composite score 計算
- [x] 9.2 為 `core/smart_dedup.py` 撰寫單元測試：七種決策的執行邏輯、版本鏈建立、fallback 行為（mock LLM）
- [x] 9.3 為搜尋管線調校撰寫測試：長度正規化、BM25 保護、CJK 閾值、新近度加成、MMR 多樣性
- [x] 9.4 端對端整合測試：remember → recall → tier 晉升 → 再次 recall 驗證 tier 變化
- [x] 9.5 為跨專案存取撰寫測試：access.json 讀取、跨專案查詢、萬用字元、source_project 標注、grant/revoke 操作
