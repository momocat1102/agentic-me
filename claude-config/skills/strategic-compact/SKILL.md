---
name: Strategic Compact
description: "Manually trigger /compact at logical phase boundaries instead of letting auto-compact happen at arbitrary points. Use during long sessions, multi-phase tasks, or when context is getting stale."
origin: ECC
---

# Strategic Compact

Manually trigger `/compact` at logical phase boundaries instead of letting auto-compact happen mid-task.

## Why Strategic > Auto

| Auto-compact | Strategic compact |
|--------------|-------------------|
| Happens at arbitrary points | You choose the boundary |
| Often mid-task | Between phases |
| Loses mid-thought context | Preserves logical continuity |
| No preparation | Can save important context first |

## When to Compact

| Phase Transition | Compact? |
|------------------|----------|
| Exploration → Implementation | YES — exploration artifacts are stale |
| Research → Design | YES — raw search results no longer needed |
| Design → Coding | YES — keep design summary, drop alternatives |
| Feature complete → Testing | YES — implementation details in code, not context |
| Bug fixed → Next task | YES — debug trace no longer needed |
| Task milestone reached | YES — good checkpoint |

## What Survives Compaction

| Persists | Lost |
|----------|------|
| CLAUDE.md instructions | Raw tool outputs |
| TodoWrite items | Intermediate reasoning |
| Files you've written | Search results |
| Git state | Alternative approaches explored |
| memcp memories | Conversation flow |

## Best Practices

1. **Save before compact**: Use `memcp_remember` for decisions/findings worth keeping
2. **Update TodoWrite**: Ensure task list reflects current state
3. **Commit code**: Uncommitted work persists in files, but context about why is lost
4. **One compact per phase**: Don't over-compact (loses too much context)
5. **Never compact mid-debug**: You'll lose the thread
6. **Announce**: Tell the user "Good checkpoint — compacting to free up context"

## Token Optimization Tips

- Use lazy loading: reference file paths instead of pasting content
- Avoid loading all skills at once — load on demand
- For repeated patterns, extract to a file and reference it
- Remove duplicate context (same info in CLAUDE.md and conversation)
