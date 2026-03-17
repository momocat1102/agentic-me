---
name: memcp-save
description: Save current session's decisions, findings, and context to MemCP persistent memory. Use this skill when the user says "save memory", "save context", "remember this", before compact, at session end, or when you've accumulated significant new knowledge (decisions made, bugs found, preferences learned) that should persist to future sessions. Also trigger proactively when context is getting full or before any destructive context operation.
---

# MemCP Save

Persist this session's important knowledge to MemCP so it survives across sessions.

## Why this matters

Anything not saved to MemCP is lost when the session ends or context compacts. Decisions get re-debated, bugs get re-discovered, and the user has to re-explain their preferences. Saving proactively prevents this waste.

## Workflow

### Step 1: Review the session

Scan the current conversation for unsaved knowledge. Look for:

| Type | category | importance | Example |
|------|----------|------------|---------|
| Architecture/design decisions | `decision` | `high` or `critical` | "Use auxiliary loss instead of replacing value target" |
| Bug discoveries and fixes | `finding` | `high` | "config missing dynamic attributes causes crash" |
| API gotchas or surprises | `finding` | `medium` | "`env.legal_actions` is a property, not a method" |
| Performance observations | `finding` | `medium` | "Solver query < 500ms when remain_count <= 8" |
| User preferences learned | `preference` | `high` | "Code comments must be in Traditional Chinese" |
| TODOs identified | `todo` | `medium` | "Phase A infrastructure not yet started" |
| Experiment results | `finding` | `high` | "B-w0.5 achieved 12% MAE reduction" |

### Step 2: Save insights

For each item worth saving, call:

```
memcp_remember(
    content="Concise but complete description",
    category="decision|finding|preference|todo",
    importance="low|medium|high|critical",
    tags="comma,separated,keywords",
    entities="key_entity1,key_entity2"
)
```

**Tag guidelines:**
- Always include the relevant subsystem (e.g., `solver`, `mcts`, `config`, `learner`)
- Include the phase or feature (e.g., `change-phase`, `solver-supervision`)
- Keep tags lowercase, use hyphens for multi-word tags

**Avoid saving:**
- Things already in MEMORY.md (stable project facts, paths, build commands)
- Session-specific details that won't matter next time (temporary debug output)
- Duplicate insights — check with `memcp_search(query)` first if unsure

### Step 3: Save large content as context (if applicable)

If the session produced substantial analysis, experiment results, or summaries:

```
memcp_load_context(
    name="descriptive-name-YYYY-MM-DD",
    content="The large content to store"
)
```

Good candidates: code review results, experiment analysis, architectural comparisons, debug session logs.

### Step 4: Confirm and report

Call `memcp_status()` to verify storage, then tell the user what was saved:

> Saved to MemCP:
> - 2 decisions (solver auxiliary loss design, curriculum approach)
> - 1 finding (config dynamic attribute gotcha)
> - 1 context stored: `experiment-analysis-2026-03-08`
> - Total insights: 12 (+3 new)

## When to trigger proactively

Save without being asked when:
- You've made or discussed 2+ significant decisions in the session
- You've discovered a non-obvious bug or API behavior
- The user corrects you on something (save the correction as a finding)
- Before recommending `/compact` to the user
- The session has been long and productive (lots of code changes, design discussions)
