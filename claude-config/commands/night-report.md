You are reviewing the results of completed night shift runs. Your job is to fetch, summarize, and present the results clearly.

## Step 1: Detect Current Project

Determine which project to focus on, in this priority order:
1. If `$ARGUMENTS` is provided, use it as a schedule name filter or schedule ID
2. Otherwise, auto-detect from the current working directory:
   - Extract the folder name from the current working directory (e.g., `/path/to/your-project` → `your-project`)
   - Also check if there's a CLAUDE.md in the current directory — look for "Central Command Project ID:" to get the project ID
   - This project ID will be used to filter schedules by their `projectId` field

## Step 2: Fetch Night Shift Data

```bash
# Get all schedules with their last run info
curl -s http://localhost:4000/api/schedules

# Get recent runs (last 20)
curl -s "http://localhost:4000/api/schedules/runs?limit=20"
```

Filter the results:
- If a project was detected (Step 1), show only schedules whose `projectId` matches the detected project. If no schedules match, fall back to showing all recent runs and tell the user "No night shift runs found for project [X], showing all recent runs instead."
- If `$ARGUMENTS` was given, filter by schedule name or ID match

## Step 3: Analyze and Summarize

For each matching schedule that has completed runs, produce a summary block:

```
### [Schedule Name] ([project])
- Status: [enabled/disabled] | Mode: [single/iterative]
- Rounds completed: [N] / [max]
- Last run: [time ago] ([duration])

#### Results by Round:
| Round | Type | Duration | Summary |
|-------|------|----------|---------|
| 1     | task | 3m 20s   | [one-line from report] |
| 2     | task | 6m 35s   | [one-line from report] |
...

#### Final Verdict:
[Extract the final feedback/verdict — READY / ACCEPTABLE / NEEDS_WORK]
[Key takeaways from the last round's report and feedback]

#### Suggested Next Steps:
[Based on feedback, what should the user do next?]
```

## Step 4: Present Summary

Sort by most recent run first.

At the end, remind the user:
- They can view details on Dashboard: `http://localhost:3000/schedules`
- They can run `/standup` or `/progress` to continue the work
- If the verdict was NEEDS_WORK, suggest specific follow-up actions based on the feedback

## Formatting Rules
- Use relative time (e.g., "3 hours ago") for timestamps
- Convert durationMs to human readable (e.g., "3m 20s")
- Keep round summaries to one line each — extract the most important result
- Use the report and feedback fields from the API response
- If report is empty or null, show "[No report submitted]"
