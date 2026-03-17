## Context

memcp 是一套基於 SQLite 圖形記憶的 MCP Server（Python 3.12，v0.3.0），目前有 71 個節點、373 條邊、24 個 MCP tools。核心架構：NodeStore（SQLite CRUD）→ EdgeManager（4 種邊自動生成 + Hebbian）→ GraphTraversal（意圖感知排序）→ Search（5 層級聯搜尋）。

**現有痛點**：
1. 衰減模型過於簡單：`0.5^(days/30)` 線性衰減，所有記憶不分層級用同一條曲線
2. 去重只有 hash + Jaccard 相似度，無法處理事實更新、矛盾、多方印證
3. `summary` 欄位存在但幾乎未使用，搜尋時比對完整 content 效率低
4. 存取強化不區分手動/自動 recall
5. 跨專案記憶不可見：在 A 專案無法查詢 B 專案的記憶，除非事先存為 global

**使用者約束**：可使用 Claude API 額度（已有訂閱），但不接受任何額外付費服務（無 Qdrant、Neo4j、OpenAI、Jina 等）。

## Goals / Non-Goals

**Goals:**
- 引入 Weibull 三層衰減模型（Peripheral/Working/Core），更貼近認知科學遺忘曲線
- 實作 LLM 驅動的七種去重決策（CREATE/MERGE/SKIP/SUPERSEDE/SUPPORT/CONTEXTUALIZE/CONTRADICT）
- 建立 L0/L1/L2 分層儲存，提升搜尋效率
- 改進存取強化機制（存取計數衰減、區分手動/自動）
- 調校搜尋管線（長度正規化、BM25 高信度保護、CJK 自適應、新近度加成、MMR 多樣性）
- 所有改動向後相容，現有記憶無損遷移
- 實作跨專案記憶存取（agentAccess config），讓專案間可共享相關記憶

**Non-Goals:**
- 不更換儲存後端（保持 SQLite）
- 不新增外部服務依賴（無向量 DB、無圖資料庫）
- 不新增 MCP tools（保持 24 個 tools 介面不變）
- 不實作 auto-recall hook（保持現有 Claude Code hooks 架構）
- 不做 Cross-Encoder Rerank（需要外部 API）

## Decisions

### D1: Weibull 衰減引擎

**選擇**：在 `memory.py:_compute_effective_importance()` 中引入 Weibull 拉伸指數衰減，替代現有的 `0.5^(days/30)` 模型。

**公式**：
```
effectiveHL = halfLife × exp(mu × importance_value)  # 上限 halfLife × 3
lambda = ln(2) / effectiveHL
recency = exp(-lambda × days^beta)
effective = max(base_weight × (1 + ln(1 + access_count)) × recency, floor)
```

**三層參數**：

| Tier | beta | floor | 語意 |
|------|------|-------|------|
| Peripheral | 1.3 | 0.10 | 斷崖式遺忘，新記憶預設 |
| Working | 1.0 | 0.25 | 標準指數衰減 |
| Core | 0.8 | 0.50 | 緩慢衰減，幾乎永存 |

**晉升/降級條件**：
- Peripheral → Working：`access_count >= 3 AND composite_score >= 0.4`
- Working → Core：`access_count >= 10 AND composite_score >= 0.7 AND importance in (high, critical)`
- Working → Peripheral：`composite_score < 0.15 OR (age > 60天 AND access_count < 3)`
- Core → Working：`composite_score < 0.15 AND access_count < 3`（極嚴格）

**替代方案**：
- FSRS-6（Vestige）：需要 21 個參數，過於複雜，且依賴回顧排程機制
- 簡單增加 importance 層級：不改變衰減曲線形狀，效果有限

**實作位置**：新增 `core/decay.py`，修改 `memory.py` 呼叫

### D2: LLM 驅動去重決策

**選擇**：在 `memcp_remember` 流程中，新增 LLM 裁決步驟，使用 Anthropic Python SDK 呼叫 Claude API。

**流程**：
```
memcp_remember(content)
  → 向量/關鍵字預篩（現有邏輯，threshold=0.7，取 top 5）
  → 若無候選 → CREATE
  → 取 top 3 候選 → 組裝 dedup prompt → Claude API 呼叫
  → 解析 7 種決策 → 執行對應操作
```

**LLM 整合方式**：使用 `anthropic` Python SDK，API key 透過環境變數 `ANTHROPIC_API_KEY` 提供。模型使用 `claude-haiku-4-5-20251001`（最便宜，去重任務不需要高推理能力）。

**替代方案**：
- 純語義相似度閾值：無法區分 SUPERSEDE vs SUPPORT vs CONTRADICT
- 規則引擎：無法理解自然語言的語義差異
- 使用 MCP 回呼 Claude Code 自身：MCP server 不能呼叫自己的 host

**成本控制**：
- 只在 `MEMCP_SMART_DEDUP=true` 時啟用（預設 false）
- 只在預篩有候選時才呼叫 LLM（無候選直接 CREATE）
- 使用 Haiku（最便宜的模型）
- Prompt 精簡到 <500 tokens input

**Fallback**：API 呼叫失敗 → 降級為現有 hash + Jaccard 去重

### D3: L0/L1/L2 分層儲存

**選擇**：在 nodes 表新增 `l0_abstract` 和 `l1_overview` 欄位，現有 `content` 作為 L2。

**生成方式**：
- `MEMCP_LAYERED_STORAGE=true` 時，`remember()` 會用 LLM 生成 L0（一句話）和 L1（結構化 JSON）
- 與去重共用同一次 LLM 呼叫（prompt 同時要求生成摘要 + 去重決策）
- 搜尋時優先比對 L0，回傳時可展開到 L1/L2

**替代方案**：
- 用現有 `summary` 欄位：只有一層，無法區分索引用和閱讀用
- 純規則摘要（截取首句）：品質不足

**實作位置**：修改 `core/node_store.py` schema，修改 `core/memory.py` remember 流程

### D4: 存取強化改進

**選擇**：修改 `_compute_effective_importance()` 中的 access_boost 計算。

**變更**：
- 存取計數加入時間衰減：`decayed_count = access_count × exp(-days_since_last / 30)`
- 新增 `auto_access_count` 欄位，區分手動/自動 recall
- 只有手動 recall 計入強化（`access_count` 只在 `memcp_recall` 工具呼叫時遞增）
- 目前的 auto-prune 路徑不觸發 access_count 增長（已是如此）

### D5: 搜尋管線調校

**選擇**：在 `search.py` 中新增三項後處理。

1. **長度正規化**：`factor = 1 / (1 + 0.5 × log2(len / 500))`，懲罰過長內容
2. **BM25 高信度保護**：score ≥ 0.75 時設下限 `score × 0.92`，保護精確詞彙匹配
3. **CJK 自適應**：偵測到中文/日文/韓文時，最低搜尋觸發長度從 15 字降到 6 字

### D6: DB 遷移策略

**選擇**：使用 memcp 現有的 `safeAddColumn` 模式（SQLite ALTER TABLE ADD COLUMN）。

**新增欄位**：
```sql
ALTER TABLE nodes ADD COLUMN tier TEXT DEFAULT 'working';
ALTER TABLE nodes ADD COLUMN l0_abstract TEXT DEFAULT '';
ALTER TABLE nodes ADD COLUMN l1_overview TEXT DEFAULT '';
ALTER TABLE nodes ADD COLUMN superseded_by TEXT DEFAULT '';
ALTER TABLE nodes ADD COLUMN supersedes TEXT DEFAULT '';
ALTER TABLE nodes ADD COLUMN support_count INTEGER DEFAULT 0;
ALTER TABLE nodes ADD COLUMN valid_from TEXT DEFAULT '';
ALTER TABLE nodes ADD COLUMN invalidated_at TEXT DEFAULT '';
ALTER TABLE nodes ADD COLUMN auto_access_count INTEGER DEFAULT 0;
```

**遷移邏輯**：
- 新欄位全部 nullable/有預設值，現有記憶無需修改
- 現有記憶預設 `tier='working'`（中間層，最合理的初始狀態）
- `l0_abstract` 和 `l1_overview` 空值時，搜尋降級為比對 content（現有行為）
- 遷移在 `NodeStore.__init__()` 中自動執行（同現有模式）

### D7: 跨專案記憶存取（agentAccess）

**選擇**：新增 `~/.memcp/access.json` 配置檔，定義每個專案可額外存取哪些專案的記憶。

**配置格式**：
```json
{
  "master-thesis": ["macs-coder", "lab-weekly"],
  "foxconn-report": ["macs-coder"],
  "macs-coder": ["master-thesis"]
}
```

**查詢邏輯變更**：
```sql
-- 現在
WHERE project IN (current_project, '_global')

-- 改成
WHERE project IN (current_project, '_global', ...accessible_projects)
```

**實作細節**：
- 配置檔在每次查詢時讀取（支援熱更新，不需重啟 server）
- 配置檔不存在時行為不變（只看 current + global）
- 搜尋結果新增 `source_project` 欄位，標注記憶來自哪個專案
- 新增 MCP tool `memcp_access_config`：查看/修改跨專案存取授權（讀寫 access.json）
- 支援 `"*"` 萬用字元表示可存取所有專案

**替代方案**：
- `scope="all"` 查詢所有專案：太粗暴，會帶入不相關的噪音
- 環境變數配置：無法表達 mapping 結構
- 在每次 remember 時決定 scope：需要預判，容易遺漏

**安全考量**：授權是單向的（A 能看 B 不代表 B 能看 A），需要雙向時兩邊都要配。

### D8: 新近度加成（Recency Boost）

**選擇**：在搜尋管線的 scoring 階段加入加法型新近度加成。

**公式**：
```
boost = exp(-age_days / recency_half_life) × recency_weight
final_score = clamp(score + boost, 0, 1)
```

預設 `recency_half_life=14`（天）、`recency_weight=0.10`。

**為什麼用加法而非乘法**：加法型確保新記憶在相似度相近時自然勝出，但不會讓不相關的新記憶蓋過高度相關的舊記憶。乘法型會讓低分記憶受益太少、高分記憶受益太多。

**配置**：`MEMCP_RECENCY_HALF_LIFE`（預設 14）、`MEMCP_RECENCY_WEIGHT`（預設 0.10）

### D9: MMR 多樣性去重（Maximal Marginal Relevance）

**選擇**：在搜尋結果返回前，用 MMR 過濾近似重複的結果。

**演算法**：
```python
selected = []
deferred = []
for candidate in sorted_results:
    if not selected or max(cosine_sim(candidate, s) for s in selected) < 0.85:
        selected.append(candidate)
    else:
        deferred.append(candidate)
return selected + deferred  # 延後而非刪除
```

**關鍵設計**：近似結果**延後**而非刪除。當結果總數不足 limit 時，deferred 的結果仍可被取用。這避免在小結果集時過度過濾。

**閾值**：`MEMCP_MMR_THRESHOLD`（預設 0.85），需要語義嵌入可用時才啟用，否則跳過。

## Risks / Trade-offs

- **[LLM API 延遲]** → 去重 + 摘要生成增加 remember 操作延遲（預估 1-3 秒）。Mitigation：可設為非同步（先存入再背景更新 L0/L1），或用 `MEMCP_SMART_DEDUP=false` 關閉
- **[API Key 管理]** → 需要使用者設定 `ANTHROPIC_API_KEY` 環境變數。Mitigation：未設定時自動降級為現有邏輯，不影響基本功能
- **[LLM 幻覺風險]** → 去重裁決可能誤判（例如將不同事實判為 SUPERSEDE）。Mitigation：破壞性決策（SUPERSEDE/CONTRADICT）只標記不刪除，舊記憶保留在版本鏈中可恢復
- **[Haiku 模型能力]** → Haiku 可能無法處理複雜的語義判斷。Mitigation：prompt 設計為結構化輸出，並允許透過 `MEMCP_DEDUP_MODEL` 切換模型
- **[DB 膨脹]** → L0/L1 新增兩個文字欄位。Mitigation：L0 限制 100 字、L1 限制 500 字，對 SQLite 影響微乎其微
- **[向後相容]** → 所有新功能預設關閉（`MEMCP_SMART_DEDUP=false`、`MEMCP_LAYERED_STORAGE=false`），只有 Weibull 衰減和存取強化改進預設啟用（純數學公式，無外部依賴）
