Summarize the day's or week's work results, update progress, and suggest next steps.

Use the progress-reviewer subagent to execute the full review flow.

## Flow Overview

1. **Fetch data**: Get recent task records, current progress, and deadlines from Central Command
2. **Present summary**: Group by project, show what was done today/this week
3. **Discuss with user**: Confirm if anything is missing, decision changes, or blockers
4. **Update progress**: Preview changes → user confirms → write to Central Command
5. **Knowledge extraction**: Store valuable knowledge in memcp
6. **Suggest next steps**: Recommend focus areas for tomorrow/next week based on roadmap

## Data Sources

```bash
# Recent tasks (today's)
curl -s "http://localhost:4000/api/tasks?limit=20"

# All project progress
curl -s http://localhost:4000/api/progress

# Deadlines
curl -s http://localhost:4000/api/deadlines

# Project list
curl -s http://localhost:4000/api/projects
```

## Update Methods

Progress updates via MCP tools:
- `report_task_completion`: log completed tasks
- `update_progress`: update progress percentage and status
- `manage_deadline`: update or complete deadlines

Knowledge extraction via memcp:
- `memcp_remember`: store new knowledge
- `memcp_recall`: check for duplicates

## Output Format

### Today's Results
| Project | What Was Done | Agent |
|---------|--------------|-------|
| ... | ... | ... |

### Progress Updates
| Project | Item | Old → New Progress | Status |
|---------|------|-------------------|--------|
| ... | ... | 30% → 50% | in_progress |

### Next Steps
- Recommended focus areas for tomorrow/next week
- Upcoming deadline reminders
- Potential risks or blockers
