Daily standup: review recent progress, see all-project overview, and plan today's work.

## Step 1: Fetch Current State

```bash
# All projects + agent statuses
curl -s http://localhost:4000/api/projects

# Detailed progress items
curl -s http://localhost:4000/api/progress

# Recent tasks (what was done last)
curl -s "http://localhost:4000/api/tasks?limit=10"

# Deadlines
curl -s http://localhost:4000/api/deadlines

# Agent statuses
curl -s http://localhost:4000/api/agents
```

If the server doesn't respond, inform the user how to start it by navigating to the system-agent directory (the agentic-me install directory that contains `agents.json` and `server/`) and running:
`npm run dev:server`

## Step 2: Morning Brief

Organize into this format:

### What Was Done Last
Group by project, list recent task records.

### All Projects Overview
Show ALL projects in tree structure (skip those at 0% with no tasks):
```
MACS Conference Paper ─── 35% (in_progress)
├── Experiment Design & Execution ─── 50%
├── Paper Writing ─── 20%
└── Submission Preparation ─── 0%

System Agent ─── 60% (in_progress)
├── Central Command Foundation ─── 100% ✓
├── Dashboard Improvements ─── 30%
└── Hook System Optimization ─── 0%
```

### Active OpenSpec Changes
For the **current project directory**, scan local `openspec/changes/` for active changes:
```bash
# List active changes (exclude archive/)
ls openspec/changes/ 2>/dev/null | grep -v archive
```

For each active change, read its `tasks.md` and count completed vs total:
```
✦ add-dark-mode — 3/7 tasks done
✦ fix-auth-flow — 0/4 tasks done
✦ streamline-project-lifecycle — 5/5 tasks done (ready to archive)
```

Also check CC for other projects' changes:
```bash
curl -s http://localhost:4000/api/projects/<PROJECT_ID>/specs 2>/dev/null
```

### Upcoming Deadlines
List deadlines within the next 7 days, showing days remaining.

## Step 3: Discuss Today's Plan

Dynamically generate options based on the fetched data. Use `AskUserQuestion`:

- Use active projects as options (up to 3 most active), label with project name, description with current progress and recent activity
- If there are active OpenSpec changes, mention them in the description (e.g., "35% — Active: add-dark-mode 3/7")
- The 4th option is always "Create new project", description "Start a brand new project with /kickoff"

```
question: "What would you like to work on today?"
header: "Today's Plan"
options:
  - label: "<Project A name>"
    description: "<progress%> — Active: <change-name> <n/m tasks>"
  - label: "<Project B name>"
    description: "<progress%> — Recent: <recent task summary>"
  - label: "Create new project"
    description: "Start a brand new project with /kickoff"
multiSelect: false
```

If the user selects Other, interpret their free-text input.

Based on the user's choice:
- Selected a project → suggest concrete next steps (see Step 4)
- Selected create new project → guide to /kickoff
- Other input → interpret accordingly

## Step 4: Start Working

Based on the discussion, suggest the appropriate next action:

**If continuing a change:**
- → `/opsx:apply <change-name>` to continue implementing tasks

**If starting something new:**
- → `/opsx:explore` to think through the idea first
- → `/opsx:propose <name>` to create a change with artifacts

**If it's a quick task:**
- → Just describe it directly, no need for a formal change

**If creating a new project:**
- → `/kickoff`

For clearly defined standalone tasks, dispatch the corresponding subagent directly (e.g., ai-engineer, research-analyst, python-pro, etc.).
