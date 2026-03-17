# Claude Code Global Config (Example)

Place this at `~/.claude/CLAUDE.md` to configure Claude Code globally.

---

## Memory Management Protocol (memcp)

### Background Knowledge Injection
When you see "=== Memory: Background knowledge loaded ===" at the start of a conversation, treat it as known context — no need to restate each item.

### When to call memcp_remember

**Save immediately:**
- User explicitly says "remember this", "always do this"
- Important environment info (paths, API endpoints, database locations)

**Review before session ends:**
- Technical decisions and reasons
- User preferences
- Solved problems (symptom + root cause + solution)
- Key project information

### Smart Dedup (Smart Remember)

Before saving a new memory:
1. **Check duplicates** — `memcp_dedup_check(content="content to save")`, returns 0-3 candidates
2. **Decide & execute** — `memcp_smart_remember`, with `decision` (CREATE/SKIP/SUPERSEDE/MERGE/SUPPORT/CONTEXTUALIZE/CONTRADICT) + `l0_abstract` (≤100 chars) + `l1_overview` (≤500 chars)

If certain it's new knowledge, skip step 1 and use `decision="CREATE"`.

### Scope Selection
- **`scope="global"`**: Cross-project knowledge (personal preferences, universal knowledge)
- **`scope="project"`** (default): Project-specific (architecture, naming, paths, config)
- Rule of thumb: Would this be useful in a different project? Yes → global, No → project

### Do NOT save
- Casual chat, temporary code snippets, already documented info, one-time task details

---

## Knowledge Extraction Protocol

**Triggers:**
1. **PreCompact**: When hook outputs "【PreCompact Knowledge Extraction】", extract immediately
2. **Stop hook progressive reminder**: At 10/20/30 turns + context ≥ 55%, review recent conversation
3. **User request**: "save memory", "save", "bye"

**Flow:** Review → Dedup check (memcp_recall) → Save (memcp_remember, following scope/importance) → Inform user

---

## Honesty Protocol

- Confidence < 50% → Research first, then execute
- Mark uncertain items with `[UNCERTAIN]`, never use vague language to claim completion
- If you don't know, say so. When reporting completion, include verification steps
- Distinguish "verified" vs "speculation"

---

## Project Workflow

### OpenSpec Workflow
- `openspec/specs/` is the source of truth
- Propose `/opsx:propose` → Implement `/opsx:apply` → Archive `/opsx:archive`

### Progress Tracking
- Completed → `report_task_completion`, Milestone → `update_progress`
