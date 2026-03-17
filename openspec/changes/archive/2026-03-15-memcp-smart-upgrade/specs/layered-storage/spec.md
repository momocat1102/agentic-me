## ADDED Requirements

### Requirement: L0 abstract field
The system SHALL store a one-sentence abstract (L0) for each memory in the `l0_abstract` column. The L0 abstract SHALL be the primary target for BM25 and vector search operations. L0 SHALL be limited to 100 characters. When L0 is empty, the system SHALL fall back to searching the full `content` field.

#### Scenario: Search uses L0 when available
- **WHEN** a memory has a non-empty `l0_abstract` and a search query is executed
- **THEN** the search SHALL match against `l0_abstract` instead of the full `content`

#### Scenario: Empty L0 falls back to content
- **WHEN** a memory has an empty `l0_abstract` (e.g., migrated from old version)
- **THEN** the search SHALL match against the full `content` field as before

### Requirement: L1 overview field
The system SHALL store a structured JSON overview (L1) for each memory in the `l1_overview` column. L1 SHALL contain key-value pairs summarizing the memory's core information. L1 SHALL be limited to 500 characters.

#### Scenario: L1 provides structured context
- **WHEN** a user retrieves a memory via `memcp_recall`
- **THEN** the response SHALL include `l1_overview` when available, providing structured context alongside the full content

### Requirement: LLM-generated summaries
When `MEMCP_LAYERED_STORAGE=true`, the system SHALL generate L0 and L1 during `memcp_remember` using the same LLM call as the smart dedup decision (combined prompt). When layered storage is enabled but smart dedup is disabled, a separate LLM call SHALL generate L0 and L1.

#### Scenario: Combined LLM call for dedup and summaries
- **WHEN** both `MEMCP_SMART_DEDUP=true` and `MEMCP_LAYERED_STORAGE=true`
- **THEN** a single LLM call SHALL return both the dedup decision and L0/L1 summaries

#### Scenario: Standalone summary generation
- **WHEN** `MEMCP_SMART_DEDUP=false` but `MEMCP_LAYERED_STORAGE=true`
- **THEN** a separate LLM call SHALL generate L0 and L1 summaries only

#### Scenario: No LLM when both disabled
- **WHEN** both `MEMCP_SMART_DEDUP=false` and `MEMCP_LAYERED_STORAGE=false`
- **THEN** no LLM calls SHALL be made during `memcp_remember`

### Requirement: Search pipeline length normalization
The system SHALL apply length normalization to search scores: `factor = 1 / (1 + 0.5 × log2(len / 500))`. Content shorter than 500 characters SHALL NOT be penalized (factor clamped to max 1.0).

#### Scenario: Long content gets penalized
- **WHEN** a 2000-character memory matches a search query
- **THEN** its score SHALL be multiplied by approximately 0.50

#### Scenario: Short content not penalized
- **WHEN** a 200-character memory matches a search query
- **THEN** its score factor SHALL be 1.0 (no penalty)

### Requirement: BM25 high-confidence protection
The system SHALL protect high-confidence BM25 matches from being overridden by semantic search. When a BM25 score >= 0.75, the system SHALL enforce a minimum fused score of `bm25_score × 0.92`.

#### Scenario: Exact keyword match preserved
- **WHEN** a search for "ANTHROPIC_API_KEY" returns a BM25 score of 0.85
- **THEN** the fused score SHALL be at least `0.85 × 0.92 = 0.782` regardless of vector similarity

### Requirement: CJK adaptive search threshold
The system SHALL detect CJK characters (Chinese, Japanese, Korean) in search queries and adjust the minimum query length threshold. CJK queries SHALL trigger search at >= 6 characters. Non-CJK queries SHALL require >= 15 characters. Queries containing `?` SHALL bypass the length threshold.

#### Scenario: Short Chinese query triggers search
- **WHEN** a search query is "記憶衰減機制" (6 CJK characters)
- **THEN** the search SHALL proceed normally

#### Scenario: Short English query skipped
- **WHEN** a search query is "memory" (6 non-CJK characters, < 15)
- **THEN** the search SHALL be skipped unless the query contains `?`

### Requirement: Recency boost in search scoring
The system SHALL apply an additive recency boost to search scores: `boost = exp(-age_days / recency_half_life) × recency_weight`. Default `recency_half_life` SHALL be 14 days and `recency_weight` SHALL be 0.10. The final score SHALL be clamped to [0, 1]. Configuration SHALL be via `MEMCP_RECENCY_HALF_LIFE` and `MEMCP_RECENCY_WEIGHT`.

#### Scenario: Recent memory gets boost
- **WHEN** a memory created 2 days ago and a memory created 60 days ago both match a query with equal base scores of 0.5
- **THEN** the 2-day-old memory SHALL have a higher final score due to recency boost

#### Scenario: Recency does not override relevance
- **WHEN** a 1-day-old memory has base score 0.3 and a 90-day-old memory has base score 0.8
- **THEN** the old memory SHALL still rank higher (boost is additive 0.10 max, not enough to overcome 0.5 gap)

### Requirement: MMR diversity deduplication
The system SHALL apply Maximal Marginal Relevance (MMR) filtering to search results before returning. Results with cosine similarity > `MEMCP_MMR_THRESHOLD` (default 0.85) to any already-selected result SHALL be deferred to the end of the list rather than removed. MMR SHALL only activate when semantic embeddings are available; otherwise it SHALL be skipped.

#### Scenario: Near-duplicate results are deferred
- **WHEN** search returns 5 results where results 2 and 3 have cosine similarity 0.92
- **THEN** result 3 SHALL be moved after result 5 in the final ranking (deferred, not deleted)

#### Scenario: Small result set preserves deferred items
- **WHEN** search returns 3 results with limit=5, and result 2 is deferred due to MMR
- **THEN** the final result list SHALL contain all 3 results (deferred items fill remaining slots)

#### Scenario: MMR skipped without embeddings
- **WHEN** semantic embeddings are not available (no model2vec/fastembed installed)
- **THEN** MMR filtering SHALL be skipped and results returned in score order only

### Requirement: Layered storage feature toggle
The layered storage system SHALL be controlled by `MEMCP_LAYERED_STORAGE` environment variable (default `false`). When disabled, the system SHALL not generate L0/L1 and search SHALL use the full content field.

#### Scenario: Feature disabled preserves existing behavior
- **WHEN** `MEMCP_LAYERED_STORAGE=false` (default)
- **THEN** `memcp_remember` SHALL not generate L0/L1 and search SHALL use full `content`
