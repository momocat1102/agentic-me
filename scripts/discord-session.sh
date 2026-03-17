#!/bin/bash
# Discord Session 管理器
# 為專案啟動獨立的 Claude Code 互動式 session（用於除錯/監控）
#
# 用法:
#   bash scripts/discord-session.sh <project>           # 啟動單一專案
#   bash scripts/discord-session.sh --all               # 啟動所有專案
#   bash scripts/discord-session.sh --list              # 列出狀態
#   bash scripts/discord-session.sh --stop              # 停止所有 session
#
# 範例:
#   bash scripts/discord-session.sh system-agent
#   bash scripts/discord-session.sh macs-coder

DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMUX_SESSION="discord"
CHANNEL_MAP="$DIR/server/src/discord-bot/channel-map.json"

# Project → directory mapping
declare -A PROJECT_DIRS=(
  ["main-agent"]="/mnt/d/WorkSpace/main-agent"
  ["system-agent"]="/mnt/d/WorkSpace/system-agent"
  ["master-thesis"]="/mnt/d/WorkSpace/master-thesis"
  ["macs-coder"]="/mnt/d/WorkSpace/macs-coder"
  ["foxconn-report"]="/mnt/d/WorkSpace/foxconn-report"
  ["lab-weekly"]="/mnt/d/WorkSpace/lab-weekly"
  ["demo-project"]="/mnt/d/WorkSpace/demo-project"
)

start_session() {
  local project=$1
  local work_dir=${PROJECT_DIRS[$project]}

  if [ -z "$work_dir" ]; then
    echo "❌ 未知專案: $project"
    return 1
  fi

  # Create tmux session if not exists
  if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    tmux new-session -d -s "$TMUX_SESSION" -n "$project" -c "$work_dir"
    # Clear CLAUDECODE to avoid nested session error
    tmux send-keys -t "$TMUX_SESSION:$project" "unset CLAUDECODE && claude --permission-mode bypassPermissions" Enter
    echo "✅ $project — 已啟動 (新 session)"
    return 0
  fi

  # Check if window already exists
  if tmux list-windows -t "$TMUX_SESSION" -F '#{window_name}' 2>/dev/null | grep -q "^${project}$"; then
    echo "⏭️  $project — 已在運行"
    return 0
  fi

  # Create new window
  tmux new-window -t "$TMUX_SESSION" -n "$project" -c "$work_dir"
  tmux send-keys -t "$TMUX_SESSION:$project" "unset CLAUDECODE && claude --permission-mode bypassPermissions" Enter
  echo "✅ $project — 已啟動"
}

list_sessions() {
  if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    echo "沒有運行中的 Discord session"
    return
  fi

  echo "=== Discord Sessions ==="
  tmux list-windows -t "$TMUX_SESSION" -F '  #{window_index}: #{window_name} (#{pane_current_command})'
  echo ""
  echo "附加: tmux attach -t $TMUX_SESSION"
}

stop_sessions() {
  if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    tmux kill-session -t "$TMUX_SESSION"
    echo "✅ Discord session '$TMUX_SESSION' 已停止"
  else
    echo "沒有運行中的 Discord session"
  fi
}

case "${1:-}" in
  --all)
    echo "=== 啟動所有專案 session ==="
    for project in "${!PROJECT_DIRS[@]}"; do
      start_session "$project"
    done
    echo ""
    echo "查看: tmux attach -t $TMUX_SESSION"
    ;;
  --list)
    list_sessions
    ;;
  --stop)
    stop_sessions
    ;;
  --help|-h|"")
    echo "用法: bash $0 <project|--all|--list|--stop>"
    echo ""
    echo "可用專案:"
    for project in "${!PROJECT_DIRS[@]}"; do
      echo "  $project → ${PROJECT_DIRS[$project]}"
    done
    ;;
  *)
    start_session "$1"
    ;;
esac
