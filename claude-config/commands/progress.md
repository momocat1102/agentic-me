View and update progress for the current project. Use `$ARGUMENTS` to specify a project ID, otherwise auto-detect.

## Step 1: Detect Project + Fetch Data

### 1.1 Detect Project ID

Determine project ID in this priority order:

1. If `$ARGUMENTS` has a value, use it as the project ID
2. Read the current directory's CLAUDE.md, look for `report_task_completion(project="..."` to extract the project ID
3. Extract the last segment of the current working directory path (e.g., `/mnt/d/WorkSpace/system-agent/` → `system-agent`)
4. If all fail, use `curl -s http://localhost:4000/api/projects` to list all projects and let the user choose

### 1.2 Fetch Data

```bash
curl -s http://localhost:4000/api/projects/<PROJECT_ID>/summary
```

If the server doesn't respond, inform the user to start it:
`cd /mnt/d/WorkSpace/system-agent && npm run dev:server`

If the project doesn't exist (404), inform the user and suggest `/kickoff` to create a new project.

## Step 2: Display Project Progress

Show only the current project. Use a numbered tree structure for easy reference in subsequent steps:

```
📋 system-agent — Agentic Me System Management (60%, in progress)

  #   Item                          Status        Progress  Updated
  1   Central Command Foundation    Completed     100%      3/8
  2   Project Tracking System       Completed     100%      3/8
  3   Dashboard Improvements        In Progress    30%      3/8
  │   3a  System Health Panel       Not Started     0%      3/8
  │   3b  Quick Command Panel       Not Started     0%      3/8
  4   Hook System Optimization      Not Started     0%      3/8

⏰ Deadlines: (list relevant deadlines, or "None")

📝 Recent Activity: (last 3 entries from recentTasks)
```

Status mapping: not_started→Not Started, in_progress→In Progress, completed→Completed, draft→Draft, review→Under Review

Child items (with parentId) are indented under their parent, numbered as parent+letter (3a, 3b...).

Items with label containing `[openspec:]` should be marked with `← spec` suffix to indicate they are synced from OpenSpec.

## Step 3: Action Menu

Use `AskUserQuestion` to present the action menu:

```
question: "What would you like to do?"
header: "Actions"
options:
  - label: "Update progress"
    description: "Select item numbers, describe progress and update percentage"
  - label: "Add item"
    description: "Add a milestone or task to the progress tree"
  - label: "Discuss direction"
    description: "Analyze gaps, suggest priorities and next steps"
  - label: "Nothing"
    description: "Exit without making any changes"
multiSelect: false
```

If the user selects "Nothing" or replies with Other saying "no" / "nothing" etc., end immediately.

Route to the corresponding branch based on reply:

### Update Progress

Use `AskUserQuestion` to ask the user which item numbers to update (can be multiple, e.g., "3a, 4").

For each selected item, ask:
"#3a System Health Panel (currently 0%): What's the new progress? What percentage?"

The user can reply in natural language, e.g.:
- "API is done, 30%"
- "All completed" (→ automatically set to completed, 100%)

You parse it into structured updates (status, progressPct, description).

### Add Item

Ask:
- Item name
- Under which parent item? (list existing top-level items for the user to choose, or "top level")
- Initial status and percentage (default: not_started, 0%)

### Discuss Direction

Analyze based on the progress tree + project CLAUDE.md + memory (use memcp_recall to query related knowledge), and suggest:

1. **Gap analysis**: aspects that may be missing from the current plan
2. **Priority suggestions**: which items should be done first and why
3. **New directions**: potential new goals based on completed work
4. **Adjustment suggestions**: whether existing items need scope changes or splitting

After discussion, convert agreed suggestions into progress updates (add items, adjust status, etc.) and proceed to Step 4 preview.

## Step 4: Preview Changes

Compile all changes into a preview, then use `AskUserQuestion` to confirm:

Preview example:
```
Items to update:
  #3a System Health Panel: 0% → 30% (not_started → in_progress)
      Note: "server health check API completed"
  Add: #3d Inbox Notifications (task, not_started, 0%) — parent: Dashboard Improvements
```

Confirmation prompt:
```
question: "Confirm writing these changes?"
header: "Confirm"
options:
  - label: "Confirm"
    description: "Write the above changes to Central Command"
  - label: "Cancel"
    description: "Discard all changes, write nothing"
multiSelect: false
```

If the user selects Other with corrections, go back to the corresponding item for re-input.

## Step 5: Write

After user confirms:

1. Update existing items: `PUT http://localhost:4000/api/progress/{id}` (with status, progressPct, description)
2. Add new items: `POST http://localhost:4000/api/progress` (with project, label, category, parentId, sortOrder)
3. If substantial progress was made, call `report_task_completion` to log a task (agentId, prompt, summary, project)
4. If deadlines changed, call `manage_deadline`

## Step 6: Confirm Results

Re-fetch `curl -s http://localhost:4000/api/progress?project=<PROJECT_ID>` and display the updated progress using Step 2's format, marking which items were just updated (← updated).

Briefly inform: "Updated N items."
