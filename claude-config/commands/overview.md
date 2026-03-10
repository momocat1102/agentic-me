View the progress of all projects and upcoming deadlines.

Execute the following steps:

1. Call `mcp__central-command__list_agents` to get all Agent statuses
2. Fetch project progress via curl:
   ```
   curl -s http://localhost:4000/api/progress
   ```
3. Fetch deadlines via curl:
   ```
   curl -s http://localhost:4000/api/deadlines
   ```
4. Fetch recent tasks via curl:
   ```
   curl -s http://localhost:4000/api/tasks?limit=5
   ```

Organize and present in the following format:

### Agent Status
List each Agent's ID and status

### Project Progress
Table showing each project (including sub-items) with name, status, and completion percentage

### Upcoming Deadlines
List incomplete deadlines sorted by date, showing days remaining

### Recent Activity
List the 5 most recent task records

If the Central Command server is not running, inform the user to start it with the appropriate command for their setup (e.g., `npm run dev:server` in the system-agent directory).
