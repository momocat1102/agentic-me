---
name: Subagent-Driven Development
description: Execute implementation plan by dispatching fresh subagent for each task, with code review between tasks. Use when executing plans with independent tasks, wanting fresh context per task with quality gates.
version: 1.1.0
---

# Subagent-Driven Development

Execute plan by dispatching fresh subagent per task, with code review after each.

**Core principle:** Fresh subagent per task + review between tasks = high quality, fast iteration.

## When to Use
- Tasks are mostly independent
- Want continuous progress with quality gates
- Staying in this session (no context switch)

## When NOT to Use
- Tasks are tightly coupled (manual execution better)
- Plan needs revision (brainstorm first)

## The Process

### 1. Load Plan
Read plan file, create TodoWrite with all tasks.

### 2. Execute Task with Subagent

For each task, dispatch a fresh subagent:

```
Agent tool:
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N from [plan-file].
    Read that task carefully. Your job is to:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation works
    4. Commit your work
    5. Report: What you implemented, test results, files changed, any issues
```

### 3. Review Subagent's Work

Dispatch code-reviewer subagent:
- Check spec compliance (does it match the plan?)
- Check code quality (bugs, edge cases, style)
- Return: Strengths, Issues (Critical/Important/Minor), Assessment

### 4. Apply Review Feedback

- **Critical issues:** Fix immediately (dispatch fix subagent)
- **Important issues:** Fix before next task
- **Minor issues:** Note for later

### 5. Mark Complete, Next Task
Mark task as completed in TodoWrite. Move to next task. Repeat 2-5.

### 6. Final Review

After all tasks complete, dispatch final code-reviewer:
- Review entire implementation
- Check all plan requirements met
- Validate overall architecture

### 7. Complete Development

After final review passes:
- Verify all tests pass
- Present options: merge, PR, keep branch, or discard

## Red Flags

**Never:**
- Skip code review between tasks
- Proceed with unfixed Critical issues
- Dispatch multiple implementation subagents in parallel (conflicts)
- Implement without reading plan task

**If subagent fails:**
- Dispatch fix subagent with specific instructions
- Don't try to fix manually (context pollution)

## Advantages

- Fresh context per task (no confusion from accumulated state)
- Review checkpoints catch issues early
- Cheaper to fix issues early than debug later
