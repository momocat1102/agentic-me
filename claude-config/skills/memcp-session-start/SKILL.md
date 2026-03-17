---
name: memcp-session-start
description: Load persistent memory from MemCP at the start of every session. Use this skill at the very beginning of a new conversation, before doing any work. Also use when the user says "load memory", "recall context", "what do you remember", or asks about previous sessions. This skill ensures continuity across sessions by loading critical decisions, project context, and stored knowledge.
---

# MemCP Session Start

Load cross-session persistent memory so you have full context before starting any work.

## Why this matters

Without loading memory, you start every session from scratch — missing past decisions, known gotchas, user preferences, and ongoing work context. MemCP stores this knowledge persistently. Loading it first prevents re-discovering things the user already told you and avoids repeating past mistakes.

## Workflow

Execute these steps in order. Use parallel tool calls where possible (steps 1-2 can run in parallel).

### Step 1: Load critical insights

```
memcp_recall(importance="critical")
```

These are non-negotiable rules and decisions — things like coding conventions, architectural constraints, and user preferences that must always be respected.

### Step 2: Load project context

```
memcp_recall(project="StochasticMuZero", limit=15)
```

Recent decisions, findings, TODOs, and experiment results specific to this project. The `limit=15` balances coverage with context budget.

### Step 3: Check stored contexts

```
memcp_list_contexts()
```

See if there are any named contexts from previous sessions (e.g., session summaries, analysis results, experiment logs). If any look relevant to the current task, mention them to the user — they can ask you to load specific ones with `memcp_get_context(name)`.

### Step 4: Summarize to the user

Briefly tell the user what you loaded. Keep it concise — 2-4 bullet points covering:
- How many insights were recalled and any critical rules
- Key recent decisions or findings
- Any stored contexts available
- Any outstanding TODOs

**Example output:**
> Loaded MemCP memory:
> - 3 critical rules (zh-TW convention, config dynamic attrs, build notes)
> - 4 project insights (solver supervision design, experiment plan, API usage)
> - 1 stored context available: `session-2026-03-08-summary`
> - Open TODO: Phase A infrastructure not yet started

## When NOT to use

- Mid-session after memory is already loaded — no need to recall twice
- If the user explicitly says they want a fresh start without prior context
