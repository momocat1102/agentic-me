## ADDED Requirements

### Requirement: Seven deduplication decisions
The system SHALL support seven deduplication decisions when a new memory is stored: CREATE (new memory), MERGE (combine with existing), SKIP (discard duplicate), SUPERSEDE (replace with version chain), SUPPORT (strengthen evidence), CONTEXTUALIZE (create linked variant), CONTRADICT (record conflict, both persist). The decision SHALL be made by LLM when `MEMCP_SMART_DEDUP=true`.

#### Scenario: New unique memory gets CREATE decision
- **WHEN** a new memory has no similar candidates (vector similarity < 0.7)
- **THEN** the system SHALL create the memory without LLM invocation

#### Scenario: Similar candidate triggers LLM adjudication
- **WHEN** a new memory has 1+ candidates with vector/keyword similarity >= 0.7
- **THEN** the system SHALL invoke LLM to decide among the seven options (top 3 candidates sent to LLM)

### Requirement: SUPERSEDE creates version chain
The system SHALL support fact versioning via SUPERSEDE. When a memory supersedes another, the old memory SHALL be marked with `invalidated_at` timestamp and `superseded_by` pointing to the new memory ID. The new memory SHALL have `supersedes` pointing to the old memory ID. Superseded memories SHALL be excluded from search results by default.

#### Scenario: Updated fact creates version chain
- **WHEN** LLM decides SUPERSEDE for "user moved to Taipei" replacing "user lives in Taichung"
- **THEN** the old memory SHALL have `invalidated_at` set and `superseded_by` set to the new memory's ID, and the new memory SHALL have `supersedes` set to the old memory's ID

#### Scenario: Superseded memories excluded from search
- **WHEN** a user searches for location information
- **THEN** only the latest version in the chain SHALL appear in results (invalidated memories excluded)

### Requirement: SUPPORT tracks evidence strength
The system SHALL track evidence strength when multiple memories corroborate the same fact. SUPPORT decisions SHALL increment the existing memory's `support_count`. The support count SHALL be used as a positive signal in search ranking.

#### Scenario: Corroborating evidence increases support count
- **WHEN** LLM decides SUPPORT for a new memory matching an existing fact
- **THEN** the existing memory's `support_count` SHALL be incremented by 1

#### Scenario: Support count boosts search ranking
- **WHEN** two memories have equal relevance scores but different support counts
- **THEN** the memory with higher support_count SHALL rank higher

### Requirement: CONTRADICT preserves both versions
The system SHALL preserve contradictory information when LLM decides CONTRADICT. Both the existing and new memories SHALL persist, and a `causal` edge with metadata `{"relation": "contradicts"}` SHALL be created between them.

#### Scenario: Contradictory facts both persist
- **WHEN** LLM decides CONTRADICT for "project uses React" vs existing "project uses Vue"
- **THEN** both memories SHALL persist and a causal edge with contradiction metadata SHALL link them

### Requirement: LLM integration for dedup
The system SHALL use the Anthropic Python SDK to invoke Claude for dedup decisions. The API key SHALL be read from `ANTHROPIC_API_KEY` environment variable. The model SHALL default to `claude-haiku-4-5-20251001` and be configurable via `MEMCP_DEDUP_MODEL`. The system SHALL fall back to existing hash + Jaccard dedup when the API key is not set or the API call fails.

#### Scenario: Missing API key falls back to basic dedup
- **WHEN** `ANTHROPIC_API_KEY` is not set and `MEMCP_SMART_DEDUP=true`
- **THEN** the system SHALL use existing hash + Jaccard dedup and log a warning

#### Scenario: API failure falls back gracefully
- **WHEN** the LLM API call times out or returns an error
- **THEN** the system SHALL fall back to CREATE decision and log the error

### Requirement: Smart dedup feature toggle
The smart dedup system SHALL be controlled by `MEMCP_SMART_DEDUP` environment variable (default `false`). When disabled, the system SHALL use existing dedup logic unchanged.

#### Scenario: Feature disabled uses existing logic
- **WHEN** `MEMCP_SMART_DEDUP=false` (default)
- **THEN** `memcp_remember` SHALL use existing hash + Jaccard dedup without any LLM calls

#### Scenario: Feature enabled activates LLM dedup
- **WHEN** `MEMCP_SMART_DEDUP=true` and `ANTHROPIC_API_KEY` is set
- **THEN** `memcp_remember` SHALL use the seven-decision LLM dedup pipeline

### Requirement: Access count decay
The system SHALL apply time decay to access counts when computing reinforcement: `decayed_count = access_count × exp(-days_since_last_access / 30)`. Only manual `memcp_recall` invocations SHALL increment `access_count`. A separate `auto_access_count` field SHALL track automatic/internal access without affecting reinforcement.

#### Scenario: Old access counts decay
- **WHEN** a memory was accessed 10 times but not in the last 60 days
- **THEN** its decayed access count SHALL be approximately `10 × exp(-2) ≈ 1.35`, significantly reducing reinforcement

#### Scenario: Auto recall does not strengthen memory
- **WHEN** the system internally accesses a memory (e.g., during consolidation preview)
- **THEN** only `auto_access_count` SHALL increment; `access_count` SHALL remain unchanged
