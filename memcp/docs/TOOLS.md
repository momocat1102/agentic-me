# MemCP Tool Reference

24 MCP tools across 8 phases. All tools return JSON strings.

## Phase 1: Memory Tools

### memcp_ping

```
memcp_ping() → str
```

Health check. Returns server status, version, and memory statistics.

**Example:**
```json
{"status": "ok", "server": "MemCP", "version": "0.1.0", "memory": {"total_insights": 42, ...}}
```

---

### memcp_remember

```
memcp_remember(
    content: str,
    category: str = "general",
    importance: str = "medium",
    tags: str = "",
    summary: str = "",
    entities: str = "",
    project: str = "",
    session: str = "",
) → str
```

Save an insight to persistent memory. Creates a graph node with auto-generated edges (semantic, temporal, causal, entity). This tool is async — it runs in a background thread to avoid blocking concurrent MCP calls.

| Parameter | Description |
|-----------|-------------|
| `content` | The insight or fact to remember (be concise but complete) |
| `category` | `decision`, `fact`, `preference`, `finding`, `todo`, `general` |
| `importance` | `low`, `medium`, `high`, `critical` |
| `tags` | Comma-separated keywords for retrieval (e.g., `"api,auth,v2"`) |
| `summary` | Optional one-line summary |
| `entities` | Optional comma-separated entities mentioned |
| `project` | Project name (auto-detected from git root if empty) |
| `session` | Session ID (auto-populated from current session if empty) |

**Examples:**
```
memcp_remember("Client prefers 500ml bottles", category="preference", importance="high", tags="client,packaging")
memcp_remember("Decided to use SQLite for graph backend", category="decision", importance="critical", tags="architecture,db")
memcp_remember("API rate limit is 100/min", category="fact", tags="api,limits")
```

**Tips:**
- **Secret detection**: Content is scanned for API keys, tokens, and credentials before storage. If a secret is detected, the tool returns `status: "error"` with a description. Patterns include AWS keys (`AKIA...`), OpenAI/Anthropic keys, GitHub tokens, Stripe keys, private key blocks, and password assignments. Disable with `MEMCP_SECRET_DETECTION=false`.
- **Duplicate detection**: Exact-match duplicates (SHA-256 hash) return `status: "duplicate"` with the existing ID. Optional semantic deduplication (cosine similarity ≥ 0.95) is available when embeddings are configured — enable with `MEMCP_SEMANTIC_DEDUP=true`.
- At the 10K insight limit, low-importance insights are auto-pruned
- Use `importance="critical"` for rules that must never be forgotten

---

### memcp_recall

```
memcp_recall(
    query: str = "",
    category: str = "",
    importance: str = "",
    limit: int = 10,
    max_tokens: int = 0,
    project: str = "",
    session: str = "",
    scope: str = "project",
) → str
```

Retrieve insights from memory with intent-aware graph traversal. This tool is async — it runs in a background thread to avoid blocking concurrent MCP calls.

| Parameter | Description |
|-----------|-------------|
| `query` | Search term (searches content, tags, summary). Prefix with "why"/"when"/"who" for intent-aware traversal |
| `category` | Filter by type |
| `importance` | Filter by priority |
| `limit` | Max results (default 10) |
| `max_tokens` | Token budget — returns results until budget exhausted (0 = unlimited) |
| `project` | Filter by project (auto-detected if empty) |
| `session` | Filter by session ID |
| `scope` | `"project"` (default), `"session"` (current only), `"all"` (cross-project) |

**Examples:**
```
memcp_recall(query="client preferences")
memcp_recall(importance="critical")
memcp_recall(query="why SQLite?")  # Intent-aware: follows causal edges
memcp_recall(query="database", max_tokens=500)  # Token-budgeted
memcp_recall(scope="all")  # Cross-project search
```

**Tips:**
- Call at session start: `memcp_recall(importance="critical")` to load critical rules
- `max_tokens` is useful to control how much context enters the prompt
- Access count is incremented on each recall, affecting importance decay

---

### memcp_forget

```
memcp_forget(insight_id: str) → str
```

Remove an insight from memory by ID. Also deletes all connected graph edges.

**Example:**
```
memcp_forget("a1b2c3d4")
```

---

### memcp_status

```
memcp_status(project: str = "", session: str = "") → str
```

Current memory statistics — insight count, categories, importance distribution, total tokens stored.

**Examples:**
```
memcp_status()
memcp_status(project="my-project")
```

---

## Phase 2: Context + Chunking + Search Tools

### memcp_load_context

```
memcp_load_context(
    name: str,
    content: str = "",
    file_path: str = "",
    project: str = "",
) → str
```

Store content as a named context variable on disk. Provide `content` OR `file_path`, not both.

| Parameter | Description |
|-----------|-------------|
| `name` | Unique name (alphanumeric, dots, hyphens, underscores) |
| `content` | The content to store |
| `file_path` | Path to a file to load as context |
| `project` | Project name (auto-detected if empty) |

**Examples:**
```
memcp_load_context("report", file_path="docs/ARCHITECTURE.md")
memcp_load_context("session-summary", content="Key decisions from this session...")
```

**Tips:**
- Max context size: 10MB (configurable via `MEMCP_MAX_CONTEXT_SIZE_MB`)
- Duplicate content is detected via SHA-256 hash
- Auto-detects content type: markdown, python, json, csv, text

---

### memcp_inspect_context

```
memcp_inspect_context(name: str) → str
```

Inspect a stored context — metadata and 5-line preview without loading full content. This is the RLM "peeking" pattern: see what's there before deciding whether to load it.

**Example:**
```
memcp_inspect_context("report")
# Returns: type=markdown, size=45KB, tokens=~11000, preview of first 5 lines
```

---

### memcp_get_context

```
memcp_get_context(name: str, start: int = 0, end: int = 0) → str
```

Read a stored context's content or a line range.

| Parameter | Description |
|-----------|-------------|
| `name` | Context name |
| `start` | Start line (1-indexed, 0 = from beginning) |
| `end` | End line (1-indexed, inclusive, 0 = to end) |

**Examples:**
```
memcp_get_context("report")  # Full content
memcp_get_context("report", start=10, end=30)  # Lines 10-30 only
```

---

### memcp_chunk_context

```
memcp_chunk_context(
    name: str,
    strategy: str = "auto",
    chunk_size: int = 0,
    overlap: int = 0,
) → str
```

Split a stored context into navigable numbered chunks.

| Parameter | Description |
|-----------|-------------|
| `name` | Context name (must already be loaded) |
| `strategy` | `auto`, `lines`, `paragraphs`, `headings`, `chars`, `regex` |
| `chunk_size` | Size per chunk (lines for `lines`, chars for `chars`) |
| `overlap` | Overlap between chunks |

**Examples:**
```
memcp_chunk_context("report", strategy="headings")  # Split on ## headers
memcp_chunk_context("code", strategy="lines", chunk_size=100, overlap=10)
memcp_chunk_context("doc", strategy="auto")  # Auto-selects based on content type
```

**Tips:**
- `auto` selects: headings for markdown, lines for code, paragraphs for prose
- Target: ~10 chunks for auto strategy

---

### memcp_peek_chunk

```
memcp_peek_chunk(
    context_name: str,
    chunk_index: int,
    start: int = 0,
    end: int = 0,
) → str
```

Read a specific chunk from a chunked context. This is the RLM "peeking" pattern.

| Parameter | Description |
|-----------|-------------|
| `context_name` | Context name |
| `chunk_index` | Chunk number (0-indexed) |
| `start` | Start line within chunk (1-indexed, 0 = from beginning) |
| `end` | End line within chunk (1-indexed, inclusive, 0 = to end) |

**Example:**
```
memcp_peek_chunk("report", 2)  # Read chunk #2
memcp_peek_chunk("report", 0, start=1, end=5)  # First 5 lines of chunk 0
```

---

### memcp_filter_context

```
memcp_filter_context(name: str, pattern: str, invert: bool = False) → str
```

Filter context content by regex pattern. Returns only matching (or non-matching) lines. This is the RLM "grepping" pattern.

**Examples:**
```
memcp_filter_context("code", pattern="def\\s+\\w+")  # Find function definitions
memcp_filter_context("log", pattern="ERROR|WARN")  # Find errors and warnings
memcp_filter_context("config", pattern="^#", invert=True)  # Non-comment lines
```

---

### memcp_list_contexts

```
memcp_list_contexts(project: str = "") → str
```

List all stored context variables with metadata summaries.

**Example:**
```
memcp_list_contexts()  # All contexts
memcp_list_contexts(project="my-project")  # Project-scoped
```

---

### memcp_clear_context

```
memcp_clear_context(name: str) → str
```

Delete a stored context and its chunks.

**Example:**
```
memcp_clear_context("old-report")
```

---

### memcp_search

```
memcp_search(
    query: str,
    limit: int = 10,
    source: str = "all",
    max_tokens: int = 0,
    project: str = "",
    scope: str = "project",
) → str
```

Search across memory insights and context chunks. Auto-selects the best available search method. This tool is async — it runs in a background thread to avoid blocking concurrent MCP calls.

| Parameter | Description |
|-----------|-------------|
| `query` | Search query |
| `limit` | Max results (default 10) |
| `source` | `"all"` (default), `"memory"`, `"contexts"` |
| `max_tokens` | Token budget (0 = unlimited) |
| `project` | Filter by project |
| `scope` | `"project"` (default), `"session"`, `"all"` |

**Examples:**
```
memcp_search("authentication patterns")
memcp_search("database", source="memory", max_tokens=500)
memcp_search("error handling", source="contexts")
```

**Tips:**
- Response includes `method` field showing which search tier was used
- Response includes `capabilities` showing which tiers are available
- BM25 index is cached in memory and invalidated automatically when insights change — no per-query rebuild
- Install `pip install memcp[search]` for BM25, `[semantic]` for embeddings, `[hnsw]` for HNSW vector index

---

## Phase 3: Graph Memory Tools

### memcp_related

```
memcp_related(
    insight_id: str,
    edge_type: str = "",
    depth: int = 1,
) → str
```

Traverse graph from an insight — find connected knowledge.

| Parameter | Description |
|-----------|-------------|
| `insight_id` | The ID of the insight to start from |
| `edge_type` | Filter: `semantic`, `temporal`, `causal`, `entity` (empty = all) |
| `depth` | How many hops to traverse (default 1) |

**Examples:**
```
memcp_related("a1b2c3d4")  # All connected insights
memcp_related("a1b2c3d4", edge_type="entity")  # Same entities only
memcp_related("a1b2c3d4", edge_type="causal", depth=2)  # Cause chain, 2 hops
```

---

### memcp_graph_stats

```
memcp_graph_stats(project: str = "") → str
```

Graph statistics — node count, edge counts by type, top 10 entities.

**Example:**
```
memcp_graph_stats()
# Returns: node_count, edge_counts (semantic/temporal/causal/entity), top_entities
```

---

## Phase 4: Cognitive Memory Tools

### memcp_reinforce

```
memcp_reinforce(
    insight_id: str,
    helpful: bool = True,
    note: str = "",
) → str
```

Provide feedback on an insight — mark it as helpful or misleading. Affects future ranking via `feedback_score`.

| Parameter | Description |
|-----------|-------------|
| `insight_id` | The ID of the insight to reinforce |
| `helpful` | `True` if the insight was helpful, `False` if misleading |
| `note` | Optional note about why |

**Logic:**
- `helpful=True`: `feedback_score += 0.1`, boost connected edges by 0.02
- `helpful=False`: `feedback_score -= 0.2`, weaken connected edges by 0.05
- `feedback_score` clamped to `[-1.0, 1.0]`
- Ranking adjustment: `total_score *= (1 + feedback_score * 0.3)`

**Examples:**
```
memcp_reinforce("a1b2c3d4", helpful=True)
memcp_reinforce("a1b2c3d4", helpful=False, note="Outdated info")
```

---

### memcp_consolidation_preview

```
memcp_consolidation_preview(
    threshold: float = 0.85,
    limit: int = 20,
    project: str = "",
) → str
```

Preview groups of similar insights that could be merged. Dry-run — no changes made.

| Parameter | Description |
|-----------|-------------|
| `threshold` | Similarity threshold for grouping (default 0.85, configurable via `MEMCP_CONSOLIDATION_THRESHOLD`) |
| `limit` | Max groups to return (default 20) |
| `project` | Filter by project (empty = all) |

Uses embedding similarity (if available) or keyword Jaccard overlap. Groups found via Union-Find.

**Example:**
```
memcp_consolidation_preview(threshold=0.7)
# Returns: groups of similar insights with their IDs and content
```

---

### memcp_consolidate

```
memcp_consolidate(
    group_ids: str,
    keep_id: str = "",
    merged_content: str = "",
) → str
```

Merge a group of similar insights into one.

| Parameter | Description |
|-----------|-------------|
| `group_ids` | Comma-separated IDs to merge |
| `keep_id` | Which ID to keep (default: most accessed) |
| `merged_content` | Optional override for the kept insight's content |

**Merge logic:**
- Union all tags and entities from the group
- Keep the highest importance level
- Sum access counts
- Re-point edges from deleted nodes to the kept node
- Delete the other nodes

**Examples:**
```
memcp_consolidate("id1,id2,id3")
memcp_consolidate("id1,id2", keep_id="id1")
memcp_consolidate("id1,id2", merged_content="Combined insight text")
```

---

## Phase 6: Retention Lifecycle Tools

### memcp_retention_preview

```
memcp_retention_preview(archive_days: int = 0, purge_days: int = 0) → str
```

Dry-run — show what would be archived or purged without making changes.

| Parameter | Description |
|-----------|-------------|
| `archive_days` | Override archive threshold (default from env: 30 days) |
| `purge_days` | Override purge threshold (default from env: 180 days) |

Items are immune from archiving if:
- `importance` is `"critical"` or `"high"`
- `access_count >= 3`
- Tags contain `"keep"`, `"important"`, or `"pinned"`

**Example:**
```
memcp_retention_preview()  # Show candidates with default thresholds
memcp_retention_preview(archive_days=7)  # More aggressive: 7-day archive threshold
```

---

### memcp_retention_run

```
memcp_retention_run(archive: bool = True, purge: bool = False) → str
```

Execute retention actions.

| Parameter | Description |
|-----------|-------------|
| `archive` | Archive eligible items — compress contexts to `.gz`, move insights to archive (default True) |
| `purge` | Purge archived items past retention period — permanently deletes and logs to `purge_log.json` (default False) |

**Examples:**
```
memcp_retention_run()  # Archive only (safe default)
memcp_retention_run(archive=True, purge=True)  # Archive + purge
```

---

### memcp_restore

```
memcp_restore(name: str, item_type: str = "auto") → str
```

Restore an archived context or insight back to active.

| Parameter | Description |
|-----------|-------------|
| `name` | Context name or insight ID to restore |
| `item_type` | `"context"`, `"insight"`, or `"auto"` (tries both) |

**Examples:**
```
memcp_restore("old-report")  # Restore archived context
memcp_restore("a1b2c3d4", item_type="insight")  # Restore archived insight
```

---

## Phase 7: Multi-Project & Session Tools

### memcp_projects

```
memcp_projects() → str
```

List all projects with aggregate stats: insight count, context count, session count, last activity.

Aggregates data from graph.db nodes, contexts meta.json, and sessions.json.

**Example:**
```
memcp_projects()
# Returns: [{name, insight_count, context_count, session_count, last_activity}, ...]
```

---

### memcp_sessions

```
memcp_sessions(project: str = "", limit: int = 20) → str
```

List sessions, optionally filtered by project. Sorted by most recent first.

| Parameter | Description |
|-----------|-------------|
| `project` | Filter by project (empty = all) |
| `limit` | Max sessions to return (default 20) |

**Examples:**
```
memcp_sessions()  # All sessions
memcp_sessions(project="memcp", limit=5)  # Last 5 sessions for memcp project
```

---

## Tool Summary Table

| # | Tool | Phase | Purpose |
|---|------|-------|---------|
| 1 | `memcp_ping` | 1 | Health check + stats |
| 2 | `memcp_remember` | 1 | Save insight (graph node + auto-edges) |
| 3 | `memcp_recall` | 1 | Intent-aware graph retrieval |
| 4 | `memcp_forget` | 1 | Remove insight + edges |
| 5 | `memcp_status` | 1 | Memory statistics |
| 6 | `memcp_load_context` | 2 | Store named context variable |
| 7 | `memcp_inspect_context` | 2 | Metadata + preview without loading |
| 8 | `memcp_get_context` | 2 | Read content or line slice |
| 9 | `memcp_chunk_context` | 2 | Split into numbered chunks |
| 10 | `memcp_peek_chunk` | 2 | Read a specific chunk |
| 11 | `memcp_filter_context` | 2 | Regex filter within context |
| 12 | `memcp_list_contexts` | 2 | List all variables |
| 13 | `memcp_clear_context` | 2 | Delete variable |
| 14 | `memcp_search` | 2 | Search across memory + contexts |
| 15 | `memcp_related` | 3 | Graph traversal |
| 16 | `memcp_graph_stats` | 3 | Graph statistics |
| 17 | `memcp_reinforce` | 4 | Feedback — mark insight as helpful/misleading |
| 18 | `memcp_consolidation_preview` | 4 | Preview similar insight groups (dry-run) |
| 19 | `memcp_consolidate` | 4 | Merge similar insights into one |
| 20 | `memcp_retention_preview` | 6 | Dry-run retention actions |
| 21 | `memcp_retention_run` | 6 | Execute archive/purge |
| 22 | `memcp_restore` | 6 | Restore from archive |
| 23 | `memcp_projects` | 7 | List projects with stats |
| 24 | `memcp_sessions` | 7 | Browse sessions |
