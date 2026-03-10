#!/bin/bash
# 啟動夜班排程：在獨立 tmux session 中以互動模式執行 /night-shift
# 用法: bash scripts/launch-night-shift.sh <schedule-id> [budget]

SCHEDULE_ID="$1"
BUDGET="${2:-5}"

if [ -z "$SCHEDULE_ID" ]; then
  echo "Usage: bash scripts/launch-night-shift.sh <schedule-id> [max-budget-usd]"
  exit 1
fi

SESSION_NAME="night-${SCHEDULE_ID:0:8}"

# 檢查是否已有同名 session
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "[!] Session '$SESSION_NAME' already exists. Attach with: tmux attach -t $SESSION_NAME"
  exit 1
fi

# 建立獨立 tmux session（bash 保底，claude 退出後 session 不消失方便 debug）
tmux new-session -d -s "$SESSION_NAME"

# 在 session 中啟動 Claude（unset CLAUDECODE 避免嵌套衝突）
tmux send-keys -t "$SESSION_NAME" "env -u CLAUDECODE claude --dangerously-skip-permissions --max-budget-usd ${BUDGET}" Enter

# 等待確認選單出現，然後選 "Yes, I accept"
# 輪詢最多 15 秒
for i in $(seq 1 15); do
  sleep 1
  CONTENT=$(tmux capture-pane -t "$SESSION_NAME" -p 2>/dev/null)
  if echo "$CONTENT" | grep -q "Yes, I accept"; then
    # 選單出現，先按 Down 移到 Yes，等一下再按 Enter
    sleep 0.5
    tmux send-keys -t "$SESSION_NAME" Down
    sleep 0.5
    tmux send-keys -t "$SESSION_NAME" Enter
    echo "[OK] Accepted bypass permissions prompt"
    break
  fi
done

# 等待 Claude 互動介面載入（偵測 ">" prompt 或 "Claude Code" 字樣）
echo "[...] Waiting for Claude to start..."
for i in $(seq 1 30); do
  sleep 1
  CONTENT=$(tmux capture-pane -t "$SESSION_NAME" -p 2>/dev/null)
  # Claude 互動模式就緒時會顯示 ">" prompt 或專案路徑
  if echo "$CONTENT" | grep -qE '(^>|╭|Tips|claude|What can I)'; then
    echo "[OK] Claude is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[WARN] Timeout waiting for Claude, sending command anyway"
  fi
done

# 再等 1 秒確保完全就緒
sleep 1

# 自動輸入 /night-shift 指令
tmux send-keys -t "$SESSION_NAME" "/night-shift ${SCHEDULE_ID}" Enter

echo "[OK] Night shift launched in tmux session: $SESSION_NAME"
echo "  Monitor: tmux attach -t $SESSION_NAME"
echo "  Dashboard: http://localhost:3000/schedules"
