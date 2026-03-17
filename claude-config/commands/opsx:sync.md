Sync all OpenSpec changes to Central Command Dashboard.

## Instructions

### Step 1: Detect Project

Read CLAUDE.md to extract project ID (from `report_task_completion(project="...")`).

If no project ID found, extract from current directory name.

### Step 2: Scan Changes

```bash
ls openspec/changes/ 2>/dev/null
```

If no changes directory or empty, report "No active changes to sync" and stop.

### Step 3: Sync Each Change

For each change directory found:

1. Check if `tasks.md` exists
2. If yes, call import-tasks:
   ```bash
   curl -s -X POST http://localhost:4000/api/projects/<PROJECT_ID>/specs/import-tasks \
     -H "Content-Type: application/json" \
     -d '{"changeName":"<name>"}'
   ```
3. Collect the result (imported/updated counts)

### Step 4: Report

```
OpenSpec Sync Complete:

  ✦ <change-1>: synced (N imported, M updated)
  ✦ <change-2>: synced (N imported, M updated)
  ✦ <change-3>: skipped (no tasks.md)

Total: X changes synced to Dashboard
```

If the server is not running, inform the user:
"Server not reachable. Navigate to the system-agent directory (the agentic-me install directory that contains `agents.json` and `server/`) and run: `npm run dev:server`"
