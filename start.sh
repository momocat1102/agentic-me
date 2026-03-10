#!/bin/bash
# Central Command 啟動腳本（在 tmux session 'cc' 中運行）
# 用法: bash start.sh
# 查看: tmux attach -t cc
# 停止: bash stop.sh

DIR="$(cd "$(dirname "$0")" && pwd)"

# 先停掉舊的
bash "$DIR/stop.sh"
sleep 1

# 清除 Next.js 快取
echo "[1/3] 清除 Next.js 快取..."
rm -rf "$DIR/dashboard/.next"

# 安裝依賴（如有需要）
echo "[2/3] 檢查依賴..."
if [ ! -d "$DIR/node_modules" ]; then
  cd "$DIR" && npm install
fi

# 在 tmux 中啟動
echo "[3/3] 啟動 tmux session 'cc'..."
tmux new-session -d -s cc -c "$DIR" "npm run dev"

echo ""
echo "=== Central Command 已啟動 ==="
echo "  Server API:  http://localhost:4000"
echo "  WebSocket:   ws://localhost:4001"
echo "  Dashboard:   http://localhost:3000"
echo ""
echo "  查看 log:  tmux attach -t cc"
echo "  停止服務:  bash stop.sh"
echo "  重啟服務:  bash restart.sh"
echo "==============================="
