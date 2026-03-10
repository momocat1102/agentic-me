Daily standup: review yesterday's progress and plan today's work.

## Step 1: Fetch Current State

```bash
# Project progress
curl -s http://localhost:4000/api/projects

# Detailed progress items
curl -s http://localhost:4000/api/progress

# Recent tasks (what was done last)
curl -s "http://localhost:4000/api/tasks?limit=10"

# Deadlines
curl -s http://localhost:4000/api/deadlines
```

If the server doesn't respond, inform the user to start it with the appropriate command for their setup (e.g., `npm run dev:server` in the system-agent directory).

## Step 2: Morning Brief

Organize into this format:

### What Was Done Last
Group by project, list recent task records.

### Current Project Progress
Show active projects in tree structure (skip those at 0% with no tasks):
```
MACS Conference Paper ─── 35% (in_progress)
├── Experiment Design & Execution ─── 50%
├── Paper Writing ─── 20%
└── Submission Preparation ─── 0%
```

### Upcoming Deadlines
List deadlines within the next 7 days, showing days remaining.

## Step 3: Discuss Today's Plan

Dynamically generate options based on the fetched project list. Use `AskUserQuestion`:

- Use active projects as options (up to 3 most active), label with project name, description with current progress and recent activity
- The 4th option is always "Create new project", description "Start a brand new project with /kickoff"

```
question: "What would you like to work on today?"
header: "Today's Plan"
options:
  - label: "<Project A name>"
    description: "<progress%> — Recent: <recent task summary>"
  - label: "<Project B name>"
    description: "<progress%> — Recent: <recent task summary>"
  - label: "Create new project"
    description: "Start a brand new project with /kickoff"
multiSelect: false
```

If the user selects Other, interpret their free-text input.

Based on the user's choice:
- Selected a project → suggest concrete steps and suitable Expert/subagent
- Selected create new project → guide to /kickoff
- Other input → interpret accordingly

## Step 4: Start Working

Based on the discussion, suggest using `/switch <expert>` to enter the appropriate expert mode:
- Coding/model training → `/switch ai-engineer`
- Literature survey → `/switch research`
- Paper writing → `/switch paper`
- Slide creation → `/switch ppt`
- Web development → `/switch web-dev`
- Debugging → `/switch debug`
- Data analysis → `/switch data-analysis`
- UI/UX design → `/switch uiux`

For clearly defined standalone tasks, dispatch the corresponding subagent directly.
To create a new project → `/kickoff`
