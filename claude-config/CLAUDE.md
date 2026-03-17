# Claude Code Global Config (Example)

Place this at `~/.claude/CLAUDE.md` to configure Claude Code globally.

---

## Memory Management (memcp)

For persistent memory across sessions, install memcp separately:
→ https://github.com/momocat1102/memcp-pro

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
