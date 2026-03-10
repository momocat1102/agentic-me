# Night Shift Guide

Night Shift enables autonomous background task execution. Claude runs tasks in a tmux session, reports progress to Central Command, and self-reviews work quality.

## Overview

```
Dashboard -> Create Schedule -> Launch Button
  -> tmux session -> Claude Code CLI
    -> /night-shift <schedule-id>
      -> Execute task -> Self-review -> Report
      -> Loop until done or stopped
```

## Setting Up a Night Shift

### 1. Create a Schedule (Dashboard)

Go to http://localhost:3000/schedules and click "New Schedule":

- **Name**: descriptive name (e.g., "Refactor auth module")
- **Project**: select target project
- **Prompt**: detailed task instructions
- **Max Rounds**: how many task->review cycles (default: 3)
- **Budget**: max USD per round (default: $5)

### 2. Launch

Click the "Launch" button on the schedule card. This:
1. Sets the schedule to enabled
2. Runs `scripts/launch-night-shift.sh` in a new tmux session
3. Starts Claude Code with `--dangerously-skip-permissions`
4. Automatically inputs `/night-shift <schedule-id>`

### 3. Monitor

- **Dashboard**: http://localhost:3000/schedules — real-time status
- **tmux**: `tmux attach -t night-<id>` — see Claude's output
- **API**: `curl http://localhost:4000/api/schedules/runs?limit=5`

## Manual Launch

```bash
# In a separate terminal (not inside an existing Claude session)
tmux new-session -s night
claude --dangerously-skip-permissions
/night-shift <schedule-id>
```

Or use the launch script:
```bash
bash scripts/launch-night-shift.sh <schedule-id> [max-budget-usd]
```

## How It Works

Each round:
1. **Fetch** schedule config from Central Command API
2. **Report** round as "running"
3. **Execute** the task prompt
4. **Self-review** the work quality
5. **Report** round as "completed" or "failed"
6. **Check** if schedule is still enabled (graceful stop mechanism)
7. **Next round** or **wrap up**

## Stopping a Night Shift

- **Graceful**: Toggle the schedule to disabled in Dashboard. The current round finishes, then stops.
- **Force**: Click "Stop Session" in Dashboard. Kills the tmux session immediately.

## Circuit Breaker

Safety mechanism to prevent runaway failures:
- Tracks consecutive failures per schedule
- After **3 consecutive failures**, automatically disables the schedule
- Sets a `kill_reason` explaining why
- Dashboard shows Circuit Breaker status badge
- Use "Reset" button to clear failure count and re-enable

## Important Notes

- Always use a **separate tmux session** for Night Shift (not the `cc` session)
- The `CLAUDECODE` environment variable must be unset (the launch script handles this)
- Each round reports progress via `POST /api/schedules/:id/report-round`
- Night Shift respects the budget limit per round
