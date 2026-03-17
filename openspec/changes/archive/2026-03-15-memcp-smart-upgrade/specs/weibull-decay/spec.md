## ADDED Requirements

### Requirement: Three-tier memory classification
The system SHALL classify every memory node into one of three tiers: `peripheral`, `working`, or `core`. New memories SHALL default to `peripheral` tier. The `tier` field SHALL be persisted in the `nodes` table.

#### Scenario: New memory defaults to peripheral
- **WHEN** a new memory is created via `memcp_remember`
- **THEN** the memory's tier SHALL be set to `peripheral`

#### Scenario: Existing memories default to working on migration
- **WHEN** the database is migrated and existing memories have no tier value
- **THEN** existing memories SHALL be assigned `working` tier

### Requirement: Weibull decay formula
The system SHALL compute memory recency using a Weibull stretched exponential decay formula: `recency = exp(-lambda × days^beta)`, where `lambda = ln(2) / effectiveHL`, `effectiveHL = min(halfLife × exp(mu × importance_value), halfLife × maxMultiplier)`, and `beta` varies by tier. The `importance_value` SHALL map from importance labels: `low=0.25, medium=0.5, high=0.75, critical=1.0`.

#### Scenario: Peripheral memory decays with steep cliff
- **WHEN** a peripheral memory (beta=1.3) with importance=medium has not been accessed for 30 days
- **THEN** its recency score SHALL be lower than a working memory (beta=1.0) with the same parameters at the same age

#### Scenario: Core memory retains high recency
- **WHEN** a core memory (beta=0.8) with importance=high has not been accessed for 60 days
- **THEN** its recency score SHALL remain above the core floor value of 0.50

#### Scenario: Importance extends effective half-life
- **WHEN** two memories have the same tier but different importance (low vs critical)
- **THEN** the critical memory SHALL have a longer effective half-life (up to 3× the base half-life)

### Requirement: Tier promotion rules
The system SHALL promote memories between tiers based on access count and composite score. Promotion from peripheral to working SHALL require `access_count >= 3 AND composite_score >= 0.4`. Promotion from working to core SHALL require `access_count >= 10 AND composite_score >= 0.7 AND importance in (high, critical)`.

#### Scenario: Frequently accessed peripheral memory promotes to working
- **WHEN** a peripheral memory has been recalled 3 times and its composite score is 0.45
- **THEN** the system SHALL promote it to `working` tier

#### Scenario: Insufficient access count prevents promotion
- **WHEN** a peripheral memory has been recalled 2 times with composite score 0.8
- **THEN** the system SHALL NOT promote it (access_count < 3)

### Requirement: Tier demotion rules
The system SHALL demote memories between tiers. Demotion from working to peripheral SHALL occur when `composite_score < 0.15 OR (age > 60 days AND access_count < 3)`. Demotion from core to working SHALL only occur when `composite_score < 0.15 AND access_count < 3`.

#### Scenario: Low-score working memory demotes to peripheral
- **WHEN** a working memory has composite_score of 0.10
- **THEN** the system SHALL demote it to `peripheral` tier

#### Scenario: Core memory is protected from easy demotion
- **WHEN** a core memory has composite_score of 0.10 but access_count of 5
- **THEN** the system SHALL NOT demote it (access_count >= 3 blocks demotion)

### Requirement: Tier evaluation timing
The system SHALL evaluate tier transitions during `memcp_recall` operations. Tier transitions SHALL NOT be triggered by internal system operations (auto-prune, consolidation, etc.).

#### Scenario: Recall triggers tier evaluation
- **WHEN** a user calls `memcp_recall` and a memory is returned
- **THEN** the system SHALL evaluate that memory's tier transition eligibility and apply any promotion or demotion

### Requirement: Composite score calculation
The system SHALL compute a composite score combining three weighted factors: `composite = recencyWeight × recency + frequencyWeight × frequency + intrinsicWeight × (importance_value × confidence)`, with default weights `recency=0.4, frequency=0.3, intrinsic=0.3`. The frequency factor SHALL use `(1 - exp(-access_count / 5)) × (0.5 + 0.5 × exp(-avg_gap_days / 30))`.

#### Scenario: High-frequency recent access yields high composite
- **WHEN** a memory has access_count=8, last accessed 2 days ago, importance=high
- **THEN** its composite score SHALL be above 0.7

#### Scenario: Never-accessed old memory yields low composite
- **WHEN** a memory has access_count=0, created 90 days ago, importance=low
- **THEN** its composite score SHALL be below 0.2

### Requirement: Decay configuration
The system SHALL support configuration via environment variables: `MEMCP_DECAY_HALF_LIFE` (default 30), `MEMCP_DECAY_MU` (default 1.5), `MEMCP_DECAY_MAX_MULTIPLIER` (default 3). The Weibull beta values per tier SHALL be configurable via `MEMCP_DECAY_BETA_PERIPHERAL` (default 1.3), `MEMCP_DECAY_BETA_WORKING` (default 1.0), `MEMCP_DECAY_BETA_CORE` (default 0.8).

#### Scenario: Custom half-life changes decay speed
- **WHEN** `MEMCP_DECAY_HALF_LIFE=60` is set
- **THEN** all memories SHALL decay at half the rate compared to the default 30-day half-life
