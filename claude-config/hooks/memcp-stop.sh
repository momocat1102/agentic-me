#!/bin/bash
# Stop Hook (memcp): Progressive reminder with 3 levels + context usage check
INPUT=$(cat)

# Read context usage percentage from hook input
CONTEXT_PCT=$(echo "$INPUT" | jq -r '.context_usage_pct // 0' 2>/dev/null || echo "0")

COUNTER_FILE="/tmp/claude_session_turns"

# Increment counter
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
  COUNT=$((COUNT + 1))
else
  COUNT=1
fi
echo "$COUNT" > "$COUNTER_FILE"

# Only show reminders when context usage >= 55%
if [ "$(echo "$CONTEXT_PCT >= 55" | bc -l 2>/dev/null || echo "0")" != "1" ] && [ "$CONTEXT_PCT" -lt 55 ] 2>/dev/null; then
  exit 0
fi

# 3-level progressive reminders
if [ "$COUNT" -ge 30 ]; then
  echo "【記憶提醒 - 緊急】已累積 ${COUNT} 輪對話且 context 使用率偏高。請立即使用 memcp_remember 存入重要知識，避免遺失。"
elif [ "$COUNT" -ge 20 ]; then
  echo "【記憶提醒 - 建議】已累積 ${COUNT} 輪對話。建議使用 memcp_remember 存入重要的決策、發現和偏好。"
elif [ "$COUNT" -ge 10 ]; then
  echo "【記憶提醒】已累積 ${COUNT} 輪對話。若有值得記住的知識點，請用 memcp_remember 存入記憶庫。"
fi
