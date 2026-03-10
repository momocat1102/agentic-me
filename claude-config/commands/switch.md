Switch to the $ARGUMENTS expert mode. Execute the full work transition flow.

Available expert modes: ai-engineer, research, paper, web-dev, ppt, debug, code-review, data-analysis, uiux

---

## Phase 1: Wrap Up Current Work

If meaningful work was done in this session (not just chatting or queries), perform the following wrap-up:

### 1.1 Structured Handoff Summary

Produce a structured handoff summary with these four sections:

```
## Handoff Summary

### Completed
- [What was specifically completed, with file paths]

### Blocked / Pending
- [Explicit TODO items with priority]
- [Why it's blocked and possible resolution directions]

### Key Decisions
- [What decisions were made + rationale]

### Relevant Files
- [List of important file paths]
```

### 1.2 Save to Memory + Report Progress

1. Use `memcp_remember` to store the handoff summary (category="fact", importance="high") so the next expert can retrieve it via `memcp_recall`
2. Read the project CLAUDE.md to get the project ID, then call `report_task_completion` to log the work
3. If a milestone was advanced, call `update_progress`

### 1.3 Update CLAUDE.md
Read the project's CLAUDE.md and update the "progress" section (if it exists).

If no meaningful work was done, skip Phase 1 entirely.

### 1.4 Clean Up Plan Files
If a plan file exists for this session (visible in system-reminder as "A plan file exists from plan mode at: ..."),
delete it: `rm -f <plan_file_path>`

---

## Phase 2: Compact

Inform the user: "Clearing context to switch to [$ARGUMENTS] mode..."

Trigger compact to compress the previous conversation.
(The PreCompact hook will automatically remind you to save important knowledge via memcp_remember first)

---

## Phase 3: Inject New Expert Knowledge

Read the file `~/.claude/experts/$ARGUMENTS.md`.

If the file doesn't exist, list available experts in `~/.claude/experts/` and ask the user to choose again.

After successful read, use the file content as your working guidelines going forward.

Inform the user:
```
Switched to [expert name] mode.

Previous work summary: [one brief sentence]

Ready to start [new domain] work. What do you need?
```
