#!/bin/bash
# Central Command 停止腳本
# 用法: bash stop.sh

echo "=== Central Command 停止中 ==="

# 1. 先發 SIGTERM 讓 server graceful shutdown（flush WAL）
pids=$(lsof -ti :4000 2>/dev/null || true)
if [ -n "$pids" ]; then
  echo "$pids" | xargs kill -15 2>/dev/null || true
  echo "[OK] 已發送 SIGTERM 到 server (port 4000)"
  sleep 2
fi

# 2. 殺掉 tmux session
if tmux has-session -t cc 2>/dev/null; then
  tmux kill-session -t cc
  echo "[OK] tmux session 'cc' 已關閉"
else
  echo "[--] tmux session 'cc' 不存在"
fi

# 3. 確保 port 釋放（SIGKILL 兜底）
for port in 3000 3001 4000 4001; do
  pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    echo "[OK] port $port 已釋放"
  fi
done

# 4. 殺掉殘留 process
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "tsx watch.*system-agent" 2>/dev/null || true

echo "=== Central Command 已停止 ==="
