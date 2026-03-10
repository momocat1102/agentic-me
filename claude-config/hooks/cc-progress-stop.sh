#!/bin/bash
# Stop Hook (Central Command): Remind agent to report progress before session ends
#
# Triggers every time the agent stops. Checks if Central Command server
# is reachable before reminding — if server is down, skip silently.

INPUT=$(cat)

# Only remind if CC server is actually running
if ! curl -s --connect-timeout 1 "${CC_API_URL:-http://localhost:4000}/api/health" > /dev/null 2>&1; then
  exit 0
fi

# Check if this session did meaningful work (at least 3 turns)
COUNTER_FILE="/tmp/claude_session_turns"
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
else
  COUNT=0
fi

if [ "$COUNT" -lt 3 ]; then
  exit 0
fi

cat <<'EOF'
【進度回報提醒】Central Command server 運行中。若本次工作有推進任何專案進度，請在結束前：
1. 呼叫 cc__report_task_completion 回報完成的任務（agentId, prompt, summary）
2. 呼叫 cc__update_progress 更新專案進度百分比（project, status, progressPct）
若本次只是閒聊或查詢，可忽略此提醒。
EOF
