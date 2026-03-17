#!/bin/bash
# discord-sync.sh — 同步 Central Command 專案到 Discord 頻道
# 用法: bash scripts/discord-sync.sh
#
# 功能:
# 1. 從 CC API 讀取所有 active 專案
# 2. 在 Discord 建立「Projects」分類 + 每個專案一個頻道（如不存在）
# 3. 更新 ~/.cc-connect/channel-map.json
# 4. 更新 /mnt/d/WorkSpace/CLAUDE.md（頻道對應規則）
# 5. 重啟 cc-connect
#
# 注意：不修改 config.toml（單一專案架構，手動管理）

set -euo pipefail

# ─── 設定 ───
CC_API="http://localhost:4000/api"
DISCORD_API="https://discord.com/api/v10"
CONFIG_FILE="$HOME/.cc-connect/config.toml"
CHANNEL_MAP="$HOME/.cc-connect/channel-map.json"
CLAUDE_MD="/mnt/d/WorkSpace/CLAUDE.md"
CATEGORY_NAME="Projects"

# 從現有 config 讀取 token 和 guild_id
BOT_TOKEN=$(grep -m1 'token' "$CONFIG_FILE" | sed 's/.*= *"//' | sed 's/".*//')
GUILD_ID=$(grep -m1 'guild_id' "$CONFIG_FILE" | sed 's/.*= *"//' | sed 's/".*//')

if [ -z "$BOT_TOKEN" ] || [ -z "$GUILD_ID" ]; then
  echo "❌ 無法從 $CONFIG_FILE 讀取 token 或 guild_id"
  exit 1
fi

# 取得 #一般 頻道 ID
GENERAL_CHANNEL_ID=$(curl -sf "$DISCORD_API/guilds/$GUILD_ID/channels" \
  -H "Authorization: Bot $BOT_TOKEN" | python3 -c "
import sys,json
for c in json.load(sys.stdin):
    if c.get('type') == 0 and c.get('name') == '一般':
        print(c['id']); break
" 2>/dev/null || echo "")

echo "=== Discord Sync ==="
echo "  Guild: $GUILD_ID"
echo ""

# ─── 1. 讀取 CC 專案 ───
echo "[1/4] 讀取 Central Command 專案..."
PROJECTS_JSON=$(curl -sf "$CC_API/projects" || echo "[]")
PROJECT_COUNT=$(echo "$PROJECTS_JSON" | python3 -c "import sys,json; data=json.load(sys.stdin); print(len([p for p in data if p.get('status')=='active']))")
echo "  找到 $PROJECT_COUNT 個 active 專案"

if [ "$PROJECT_COUNT" -eq 0 ]; then
  echo "❌ 沒有 active 專案，請確認 CC server 已啟動"
  exit 1
fi

# ─── 2. 取得/建立 Discord 分類 ───
echo "[2/4] 確認 Discord 分類..."
CHANNELS_JSON=$(curl -sf "$DISCORD_API/guilds/$GUILD_ID/channels" \
  -H "Authorization: Bot $BOT_TOKEN")

CATEGORY_ID=$(echo "$CHANNELS_JSON" | python3 -c "
import sys,json
channels = json.load(sys.stdin)
for c in channels:
    if c.get('type') == 4 and c.get('name','').lower() == '${CATEGORY_NAME,,}':
        print(c['id']); break
" 2>/dev/null || echo "")

if [ -z "$CATEGORY_ID" ]; then
  echo "  建立「$CATEGORY_NAME」分類..."
  CATEGORY_RESPONSE=$(curl -sf -X POST "$DISCORD_API/guilds/$GUILD_ID/channels" \
    -H "Authorization: Bot $BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$CATEGORY_NAME\", \"type\": 4}")
  CATEGORY_ID=$(echo "$CATEGORY_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  echo "  分類已建立: $CATEGORY_ID"
  sleep 1
else
  echo "  分類已存在: $CATEGORY_ID"
fi

CHANNELS_JSON=$(curl -sf "$DISCORD_API/guilds/$GUILD_ID/channels" \
  -H "Authorization: Bot $BOT_TOKEN")

# ─── 3. 為每個專案建立頻道 ───
echo "[3/4] 同步專案頻道..."

EXISTING_CHANNELS=$(echo "$CHANNELS_JSON" | python3 -c "
import sys,json
channels = json.load(sys.stdin)
for c in channels:
    if c.get('parent_id') == '$CATEGORY_ID' and c.get('type') == 0:
        print(f\"{c['name']}|{c['id']}\")
")

declare -A CHANNEL_MAP_DICT
while IFS='|' read -r name id; do
  [ -n "$name" ] && CHANNEL_MAP_DICT["$name"]="$id"
done <<< "$EXISTING_CHANNELS"

PROJECTS_DATA=$(echo "$PROJECTS_JSON" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for p in data:
    if p.get('status') == 'active':
        pid = p.get('id','')
        name = p.get('name','')
        path = p.get('path','')
        if not path:
            path = f'/mnt/d/WorkSpace/{pid}'
        print(f'{pid}|{name}|{path}')
")

declare -A PROJECT_CHANNELS
declare -A PROJECT_PATHS
declare -A PROJECT_NAMES

while IFS='|' read -r pid pname ppath; do
  [ -z "$pid" ] && continue
  channel_name="$pid"
  PROJECT_PATHS["$pid"]="$ppath"
  PROJECT_NAMES["$pid"]="$pname"

  if [ -n "${CHANNEL_MAP_DICT[$channel_name]+x}" ]; then
    echo "  ✓ #$channel_name 已存在"
    PROJECT_CHANNELS["$pid"]="${CHANNEL_MAP_DICT[$channel_name]}"
  else
    echo "  + 建立 #$channel_name ($pname)..."
    CHANNEL_RESPONSE=$(curl -sf -X POST "$DISCORD_API/guilds/$GUILD_ID/channels" \
      -H "Authorization: Bot $BOT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"$channel_name\", \"type\": 0, \"parent_id\": \"$CATEGORY_ID\", \"topic\": \"$pname\"}")
    CHANNEL_ID=$(echo "$CHANNEL_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
    PROJECT_CHANNELS["$pid"]="$CHANNEL_ID"
    sleep 1
  fi
done <<< "$PROJECTS_DATA"

# ─── 4. 更新 channel-map.json + CLAUDE.md ───
echo "[4/4] 更新 channel-map.json + CLAUDE.md..."

# channel-map.json
python3 -c "
import json
mapping = {}
# #一般 → main-agent
general_id = '$GENERAL_CHANNEL_ID'
if general_id:
    mapping[general_id] = {'name': '一般', 'dir': '/mnt/d/WorkSpace/main-agent'}
" > /dev/null

# 用 bash 直接生成 JSON
echo "{" > "$CHANNEL_MAP"
if [ -n "$GENERAL_CHANNEL_ID" ]; then
  echo "  \"$GENERAL_CHANNEL_ID\": { \"name\": \"一般\", \"dir\": \"/mnt/d/WorkSpace/main-agent\" }," >> "$CHANNEL_MAP"
fi
FIRST=true
for pid in "${!PROJECT_CHANNELS[@]}"; do
  channel_id="${PROJECT_CHANNELS[$pid]}"
  work_dir="${PROJECT_PATHS[$pid]}"
  echo "  \"$channel_id\": { \"name\": \"$pid\", \"dir\": \"$work_dir\" }," >> "$CHANNEL_MAP"
done
# 移除最後一個逗號
sed -i '$ s/,$//' "$CHANNEL_MAP"
echo "}" >> "$CHANNEL_MAP"

# CLAUDE.md
cat > "$CLAUDE_MD" << 'HEADER'
# Discord 頻道自動切換

你正在透過 cc-connect Discord Bot 與使用者互動。

## 第一則訊息時必做
1. 執行 `echo $CC_SESSION_KEY` 取得 session key（格式：`discord:<channel_id>:<user_id>`）
2. 根據 channel_id 切換到對應的專案目錄（見下方對應表）
3. 讀取該目錄的 CLAUDE.md 了解專案背景

## 頻道對應表
HEADER

if [ -n "$GENERAL_CHANNEL_ID" ]; then
  echo "- \`$GENERAL_CHANNEL_ID\`（#一般）→ \`cd /mnt/d/WorkSpace/main-agent\`" >> "$CLAUDE_MD"
fi
for pid in "${!PROJECT_CHANNELS[@]}"; do
  channel_id="${PROJECT_CHANNELS[$pid]}"
  work_dir="${PROJECT_PATHS[$pid]}"
  echo "- \`$channel_id\`（#$pid）→ \`cd $work_dir\`" >> "$CLAUDE_MD"
done

cat >> "$CLAUDE_MD" << 'FOOTER'

## 規則
- 永遠用繁體中文回覆
- 回覆要簡潔
- 如果 channel_id 不在上面列表中，就留在 /mnt/d/WorkSpace/main-agent
FOOTER

echo "  ✓ channel-map.json 已更新"
echo "  ✓ CLAUDE.md 已更新"

echo ""
echo "=== 同步完成 ==="
echo "  專案數: ${#PROJECT_CHANNELS[@]}"
echo ""

# 自動重啟 cc-connect
if tmux has-session -t cc 2>/dev/null; then
  pkill -f cc-connect 2>/dev/null || true
  sleep 2
  tmux new-window -t cc -n bot "cc-connect 2>&1 | tee $HOME/.cc-connect/bot.log" 2>/dev/null && \
    echo "  ✓ cc-connect 已重啟（tmux cc:bot）" || \
    echo "  ⚠ 請手動重啟 cc-connect"
fi
