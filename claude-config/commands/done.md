End the current work session. Execute the full wrap-up flow: progress reporting + knowledge extraction.

## Step 1: Review Current Work

Briefly summarize what was done in this conversation. If no meaningful work was done (just chatting), skip to Step 3.

## Step 1.5: OpenSpec Tasks Update (if applicable)

If the current project has `openspec/changes/` with active changes:

1. List active changes:
   ```bash
   ls openspec/changes/ 2>/dev/null
   ```

2. For each active change, read `tasks.md` and compare with the work done in this session

3. Suggest which tasks to check off based on the work completed:
   ```
   ✦ <change-name>:
     ☐ → ☑ <task description> (reason: implemented in this session)
   ```

4. Use `AskUserQuestion` to confirm the suggested updates

5. After confirmation, update `tasks.md` files (change `- [ ]` to `- [x]`)

6. Sync to Dashboard:
   ```bash
   curl -s -X POST http://localhost:4000/api/projects/<PROJECT_ID>/specs/import-tasks \
     -H "Content-Type: application/json" \
     -d '{"changeName":"<name>"}'
   ```

7. If all tasks in a change are complete, suggest running `/opsx:archive <name>`

## Step 2: Progress Reporting (Central Command)

### Log the Task
Call `report_task_completion`:
- `agentId`: determine from current workspace
- `prompt`: the original task request
- `summary`: completion summary, **include output file paths and key results** (this serves as context for the next Agent)
- `project`: the corresponding project ID
- `status`: completed or failed

### Update Progress (if milestones were advanced)
Pull current progress:
```bash
curl -s http://localhost:4000/api/progress
```

Preview the items to update, then use `AskUserQuestion` to confirm:

Preview example:
```
Update: MACS experiments → 30% → 50% (note: completed second round of experiments)
```

Confirmation prompt:
```
question: "Confirm writing these progress updates?"
header: "Confirm"
options:
  - label: "Confirm"
    description: "Write progress updates to Central Command"
  - label: "Skip"
    description: "Skip progress update, continue to knowledge extraction"
multiSelect: false
```

If the user selects Other with corrections, adjust and re-preview.
After confirmation, call `update_progress` to write.

### Update Deadlines (if applicable)
Call `manage_deadline`

If MCP tools are unavailable, fall back to curl against localhost:4000 API.

## Step 3: Knowledge Extraction (memcp)

Review the conversation for knowledge worth long-term preservation:
- Technical decisions and rationale
- User preferences
- Problem symptoms + root cause + solution
- Important changes to project architecture or configuration

For EACH knowledge item you plan to save, follow this dedup-first protocol:

1. **Search first**: Use `memcp_search` or `memcp_recall` with relevant keywords to find existing memories on the same topic
2. **Decide action**:
   - **No match found** → `memcp_remember` to create new
   - **Found outdated version** → `memcp_forget` the old one, then `memcp_remember` the updated version
   - **Found similar with new info** → `memcp_forget` the old one, then `memcp_remember` a merged/complete version
   - **Found exact duplicate** → skip, do not save
3. **Scope rule**: Would this memory be useful in a different project? Yes → `scope="global"`, No → `scope="project"`

IMPORTANT: Never leave outdated memories coexisting with updated ones. Always forget-then-remember to replace.

## Step 3.5: Clean Up Plan Files
If a plan file exists for this session (visible in system-reminder as "A plan file exists from plan mode at: ..."),
delete it: `rm -f <plan_file_path>`

## Step 4: Report Back

Briefly inform the user:
- What task was logged
- Which progress items were updated
- How many knowledge items were extracted to memory
- The next Agent will automatically see this context on startup
