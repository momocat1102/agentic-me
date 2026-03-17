---
name: memcp-search
description: Search MemCP persistent memory for past decisions, findings, and stored contexts. Use when the user says "search memory", "what did we decide about X", "find previous Y", "do you remember Z", or when you need to look up past context before making a decision. Also use proactively when you're about to make a decision that might contradict a previous one, or when the user asks about something that sounds like it was discussed before.
---

# MemCP Search

Search across persistent memory to find past decisions, findings, and stored contexts.

## Why this matters

MemCP accumulates knowledge across sessions. Before re-researching something or making a decision that might conflict with a previous one, search first. This prevents contradictions and builds on prior work instead of starting over.

## Workflow

### Step 1: Search insights and contexts

```
memcp_search(query="user's search terms", scope="project")
```

Use `scope="all"` for cross-project searches. The search auto-selects the best method (BM25 > keyword).

For intent-aware retrieval, use `memcp_recall` with prefixes:
- `memcp_recall(query="why did we choose X")` — follows causal edges
- `memcp_recall(query="when was X decided")` — temporal traversal
- `memcp_recall(query="solver", category="decision")` — filtered by type

### Step 2: Expand connections (if results found)

If search returns relevant insights, explore their connections:

```
memcp_related(insight_id="abc123", edge_type="", depth=1)
```

This traverses the knowledge graph to find related decisions, findings, and context. Edge types:
- `semantic` — similar content
- `temporal` — created around the same time
- `causal` — cause/effect relationships
- `entity` — shared entities (e.g., same module or concept)

### Step 3: Load stored contexts (if relevant)

If search points to a stored context:

```
memcp_inspect_context(name="context-name")  # Preview first
memcp_get_context(name="context-name")       # Load if relevant
```

For large contexts, use chunked access:
```
memcp_chunk_context(name="context-name", strategy="auto")
memcp_peek_chunk(context_name="context-name", chunk_index=0)
```

### Step 4: Present results

Organize findings for the user:
- Group by category (decisions, findings, TODOs)
- Highlight anything directly relevant to the current task
- Note any contradictions or outdated information
- If an insight is outdated, offer to update it with `memcp_remember()` or remove it with `memcp_forget()`

## Proactive usage

Search without being asked when:
- The user asks about something that sounds like a past discussion topic
- You're about to suggest an approach — check if a decision was already made
- The user mentions a concept that might have stored context (experiments, analysis)
- You encounter a tricky API or config issue — check if there's a known gotcha
