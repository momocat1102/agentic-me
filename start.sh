#!/bin/bash
# Central Command 啟動腳本（在 tmux session 'cc' 中運行）
# 用法: bash start.sh
# 查看: tmux attach -t cc
# 停止: bash stop.sh

DIR="$(cd "$(dirname "$0")" && pwd)"

# 先停掉舊的
bash "$DIR/stop.sh"
sleep 1

# 安裝依賴（如有需要）
echo "[1/5] 檢查依賴..."
if [ ! -d "$DIR/node_modules" ]; then
  cd "$DIR" && npm install
fi

# Build Dashboard（production mode，dev mode 不穩定）
echo "[2/5] 建置 Dashboard..."
cd "$DIR/dashboard" && npx next build
if [ $? -ne 0 ]; then
  echo "❌ Dashboard build 失敗！"
  exit 1
fi

# 在 tmux 中啟動 Server + Dashboard (production)
echo "[3/5] 啟動 tmux session 'cc'..."
tmux new-session -d -s cc -n server -c "$DIR" "npm run dev -w server"
tmux new-window -t cc -n dashboard -c "$DIR/dashboard" "npx next start -p 3000"

# 啟動 Discord Bridge Bot（整合訊息橋接 + Slash Commands，取代 cc-connect）
if [ -f "$HOME/.cc-connect/config.toml" ]; then
  echo "[4/5] 啟動 Discord Bridge Bot..."
  tmux new-window -t cc -n discord-bot "cd $DIR && npm run dev:slash-bot 2>&1"
  echo "[OK] Discord Bridge Bot 已在 tmux window 'discord-bot' 啟動"
else
  echo "[4/5] cc-connect config 不存在（需要 token），跳過 Discord Bot"
fi

echo ""
echo "=== Central Command 已啟動 ==="
echo "  Server API:  http://localhost:4000"
echo "  WebSocket:   ws://localhost:4001"
echo "  Dashboard:   http://localhost:3000"
echo "  Discord Bot: tmux cc:discord-bot"
echo ""
echo "  查看 log:  tmux attach -t cc"
echo "  停止服務:  bash stop.sh"
echo "  重啟服務:  bash restart.sh"
echo "==============================="
