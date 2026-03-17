#!/usr/bin/env bash
# Agentic Me — One-click Setup Script
# Run: bash scripts/setup.sh
#
# This script sets up the entire Agentic Me ecosystem:
# 1. Install Node.js dependencies
# 2. Install & configure memcp (persistent memory)
# 3. Install & configure OpenSpec CLI
# 4. Set up Claude Code hooks, MCP servers, and global config
# 5. Build the server

set -e

# ── Colors ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }
step()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

# ── Pre-checks ──────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

step "Pre-flight Checks"

# Node.js
if ! command -v node &>/dev/null; then
  err "Node.js not found. Please install Node.js >= 22: https://nodejs.org"
  exit 1
fi
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 22 ]; then
  err "Node.js >= 22 required (found v$(node -v))"
  exit 1
fi
ok "Node.js $(node -v)"

# Claude Code
if ! command -v claude &>/dev/null; then
  warn "Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code"
  read -p "Install now? [Y/n] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    npm install -g @anthropic-ai/claude-code
  else
    err "Claude Code is required. Exiting."
    exit 1
  fi
fi
ok "Claude Code $(claude --version 2>/dev/null || echo 'installed')"

# Python (for memcp)
if ! command -v python3 &>/dev/null; then
  err "Python 3 not found. memcp requires Python 3.11+"
  exit 1
fi
ok "Python $(python3 --version | cut -d' ' -f2)"

# ── Step 1: Install Node.js Dependencies ────────────────
step "Step 1: Install Node.js Dependencies"

cd "$REPO_DIR"
npm install
ok "Dependencies installed"

# ── Step 2: Build Server ────────────────────────────────
step "Step 2: Build Server"

cd "$REPO_DIR/server"
npx tsc
ok "Server built → server/dist/"

# ── Step 3: Install memcp ──────────────────────────────
step "Step 3: Install memcp (Persistent Memory)"

MEMCP_DIR="$CLAUDE_DIR/mcp-servers/memcp"

if [ -d "$MEMCP_DIR/src" ]; then
  ok "memcp already installed at $MEMCP_DIR"
else
  info "Cloning memcp..."
  mkdir -p "$CLAUDE_DIR/mcp-servers"
  git clone https://github.com/anthropics/memcp.git "$MEMCP_DIR" 2>/dev/null || {
    warn "Clone failed, trying update..."
    cd "$MEMCP_DIR" && git pull
  }
  ok "memcp cloned"
fi

info "Setting up memcp Python environment..."
cd "$MEMCP_DIR"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -e ".[all]" --quiet 2>/dev/null || pip install -e . --quiet
deactivate
ok "memcp environment ready"

# ── Step 4: Install OpenSpec CLI ────────────────────────
step "Step 4: Install OpenSpec CLI"

if command -v openspec &>/dev/null; then
  ok "OpenSpec already installed"
else
  info "Installing OpenSpec..."
  npm install -g @anthropic-ai/openspec 2>/dev/null || npm install -g openspec 2>/dev/null || {
    warn "OpenSpec npm package not found. Trying from source..."
    if [ ! -d "/tmp/openspec-install" ]; then
      git clone https://github.com/Fission-AI/OpenSpec.git /tmp/openspec-install 2>/dev/null
    fi
    cd /tmp/openspec-install && npm install && npm link 2>/dev/null || true
  }
  if command -v openspec &>/dev/null; then
    ok "OpenSpec installed"
  else
    warn "OpenSpec CLI not available globally — you can still use OpenSpec via slash commands"
  fi
fi

# ── Step 5: Configure Claude Code ───────────────────────
step "Step 5: Configure Claude Code"

mkdir -p "$CLAUDE_DIR/hooks"
mkdir -p "$CLAUDE_DIR/commands"

# ── 5a: MCP Servers Config ──
info "Configuring MCP servers..."

MCP_CONFIG="$CLAUDE_DIR/mcp.json"
cat > "$MCP_CONFIG" << EOMCP
{
  "mcpServers": {
    "memcp": {
      "command": "$MEMCP_DIR/.venv/bin/python",
      "args": ["-m", "memcp.server"],
      "cwd": "$MEMCP_DIR"
    },
    "central-command": {
      "command": "node",
      "args": ["$REPO_DIR/server/dist/mcp-server.js"],
      "env": {
        "CC_API_URL": "http://localhost:4000/api"
      }
    }
  }
}
EOMCP
ok "MCP config → $MCP_CONFIG"

# ── 5b: Hook Scripts ──
info "Installing hook scripts..."

# SessionStart hook
cat > "$CLAUDE_DIR/hooks/memcp-session-start.sh" << 'EOHOOK'
#!/usr/bin/env bash
INPUT=$(cat)
SOURCE=$(echo "$INPUT" | grep -o '"source":"[^"]*"' | sed 's/"source":"//;s/"//' || echo "startup")
CWD=$(echo "$INPUT" | grep -o '"cwd":"[^"]*"' | sed 's/"cwd":"//;s/"//' || echo "")
SOURCE="${SOURCE:-startup}"
if [[ "$SOURCE" == "resume" ]]; then exit 0; fi
echo "0" > /tmp/claude_session_turns

DATA_DIR="${MEMCP_DATA_DIR:-$HOME/.memcp}"
DB_PATH="$DATA_DIR/graph.db"
PROJECT_NAME="default"
if [[ -n "$CWD" ]]; then
  GIT_NAME=$(cd "$CWD" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null | xargs basename 2>/dev/null || echo "")
  if [[ -n "$GIT_NAME" ]]; then PROJECT_NAME="$GIT_NAME"; else PROJECT_NAME=$(basename "$CWD"); fi
fi

MEMORIES=""
if [[ -s "$DB_PATH" ]]; then
  MEMORIES=$(sqlite3 -noheader "$DB_PATH" <<EOSQL 2>/dev/null || echo ""
SELECT '- ' || COALESCE(l0_abstract, SUBSTR(content, 1, 120)) FROM nodes
WHERE (project = '$(echo "$PROJECT_NAME" | sed "s/'/''/g")' OR project = '_global')
  AND importance IN ('critical', 'high')
ORDER BY CASE importance WHEN 'critical' THEN 1 WHEN 'high' THEN 2 END, created_at DESC
LIMIT 8;
EOSQL
  )
fi
if [[ -n "$MEMORIES" ]]; then
  echo "=== Memory: Background knowledge loaded ==="
  echo "$MEMORIES"
  echo "================================"
fi

if curl -s --connect-timeout 1 http://localhost:4000/api/health > /dev/null 2>&1; then
  TASKS=$(curl -s --connect-timeout 2 "http://localhost:4000/api/tasks?limit=10" 2>/dev/null || echo "")
  if [[ -n "$TASKS" && "$TASKS" != "[]" ]]; then
    TASK_LINES=$(echo "$TASKS" | grep -o '"agentId":"[^"]*"' | sed 's/"agentId":"//;s/"//' > /tmp/cc_agents.tmp
      echo "$TASKS" | grep -o '"summary":"[^"]*"' | sed 's/"summary":"//;s/"//' > /tmp/cc_summaries.tmp
      paste -d'|' /tmp/cc_agents.tmp /tmp/cc_summaries.tmp 2>/dev/null | head -5 | while IFS='|' read -r agent summary; do
        [[ -n "$summary" ]] && echo "- [${agent}] ${summary:0:120}"
      done
      rm -f /tmp/cc_agents.tmp /tmp/cc_summaries.tmp
    )
    if [[ -n "$TASK_LINES" ]]; then
      echo ""
      echo "=== Central Command: Recent Activity ==="
      echo "$TASK_LINES"
      echo "================================"
    fi
  fi
fi
exit 0
EOHOOK

# PreCompact hook
cat > "$CLAUDE_DIR/hooks/memcp-pre-compact.sh" << 'EOHOOK'
#!/bin/bash
INPUT=$(cat)
cat <<'EOF'
{"blockExecution": true, "systemMessage": "【PreCompact Knowledge Extraction】Context is about to be compacted. Before compaction:\n1. Use memcp_remember() to save important decisions, findings, preferences\n2. Use memcp_load_context() for large content blocks\n3. Unsaved content will be lost after compaction\n4. Tell the user how many knowledge items were extracted"}
EOF
EOHOOK

# Stop hook (memcp)
cat > "$CLAUDE_DIR/hooks/memcp-stop.sh" << 'EOHOOK'
#!/bin/bash
INPUT=$(cat)
COUNTER_FILE="/tmp/claude_session_turns"
if [ -f "$COUNTER_FILE" ]; then COUNT=$(cat "$COUNTER_FILE"); COUNT=$((COUNT + 1)); else COUNT=1; fi
echo "$COUNT" > "$COUNTER_FILE"

CONTEXT_PCT=$(echo "$INPUT" | grep -o '"context_usage_pct":[0-9]*' | grep -o '[0-9]*' || echo "0")
if [ "${CONTEXT_PCT:-0}" -lt 55 ] 2>/dev/null; then exit 0; fi

if [ "$COUNT" -ge 30 ]; then
  echo "【Memory Reminder - URGENT】${COUNT} turns accumulated with high context usage. Please save important knowledge with memcp_remember now."
elif [ "$COUNT" -ge 20 ]; then
  echo "【Memory Reminder - Suggested】${COUNT} turns accumulated. Consider saving decisions and findings with memcp_remember."
elif [ "$COUNT" -ge 10 ]; then
  echo "【Memory Reminder】${COUNT} turns accumulated. Save noteworthy knowledge with memcp_remember."
fi
EOHOOK

# PostToolUse hook (reset counter)
cat > "$CLAUDE_DIR/hooks/memcp-reset-counter.sh" << 'EOHOOK'
#!/bin/bash
INPUT=$(cat)
echo "0" > /tmp/claude_session_turns
EOHOOK

# Stop hook (Central Command progress)
cat > "$CLAUDE_DIR/hooks/cc-progress-stop.sh" << 'EOHOOK'
#!/bin/bash
INPUT=$(cat)
if ! curl -s --connect-timeout 1 http://localhost:4000/api/health > /dev/null 2>&1; then exit 0; fi
COUNTER_FILE="/tmp/claude_session_turns"
COUNT=0
[ -f "$COUNTER_FILE" ] && COUNT=$(cat "$COUNTER_FILE")
[ "$COUNT" -lt 3 ] && exit 0
cat <<'EOF'
【Progress Reminder】Central Command server is running. If you made progress on any project, please:
1. Call report_task_completion to log completed tasks
2. Call update_progress to update project progress percentage
Ignore this if it was just a chat or query session.
EOF
EOHOOK

chmod +x "$CLAUDE_DIR/hooks/"*.sh
ok "Hook scripts installed"

# ── 5c: Settings.json (hooks config) ──
info "Configuring Claude Code settings..."

SETTINGS_FILE="$CLAUDE_DIR/settings.json"

# Read existing settings or start fresh
if [ -f "$SETTINGS_FILE" ]; then
  # Backup existing
  cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak"
  info "Backed up existing settings → settings.json.bak"
fi

cat > "$SETTINGS_FILE" << 'EOSETTINGS'
{
  "permissions": {
    "allow": [
      "Bash",
      "Read",
      "Edit",
      "Write",
      "Glob",
      "Grep",
      "WebFetch",
      "WebSearch",
      "mcp__memcp__memcp_ping",
      "mcp__memcp__memcp_remember",
      "mcp__memcp__memcp_recall",
      "mcp__memcp__memcp_forget",
      "mcp__memcp__memcp_status",
      "mcp__memcp__memcp_search",
      "mcp__memcp__memcp_related",
      "mcp__memcp__memcp_graph_stats",
      "mcp__memcp__memcp_reinforce",
      "mcp__memcp__memcp_consolidation_preview",
      "mcp__memcp__memcp_consolidate",
      "mcp__memcp__memcp_load_context",
      "mcp__memcp__memcp_inspect_context",
      "mcp__memcp__memcp_get_context",
      "mcp__memcp__memcp_list_contexts",
      "mcp__memcp__memcp_clear_context",
      "mcp__memcp__memcp_retention_preview",
      "mcp__memcp__memcp_retention_run",
      "mcp__memcp__memcp_restore",
      "mcp__memcp__memcp_projects",
      "mcp__memcp__memcp_sessions",
      "mcp__memcp__memcp_dedup_check",
      "mcp__memcp__memcp_smart_remember",
      "mcp__memcp__memcp_access_config",
      "mcp__central-command__list_agents",
      "mcp__central-command__get_task_history",
      "mcp__central-command__report_task_completion",
      "mcp__central-command__update_progress",
      "mcp__central-command__manage_deadline"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/memcp-session-start.sh",
            "timeout": 10000
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/memcp-pre-compact.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/memcp-stop.sh",
            "timeout": 5000
          },
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/cc-progress-stop.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "memcp_remember|memcp_load_context",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/memcp-reset-counter.sh",
            "timeout": 3000
          }
        ]
      }
    ]
  }
}
EOSETTINGS
ok "Settings configured"

# ── 5d: Install Commands (slash commands) ──
info "Installing slash commands..."

COMMANDS_SRC="$REPO_DIR/claude-config/commands"
COMMANDS_DST="$CLAUDE_DIR/commands"
mkdir -p "$COMMANDS_DST"

if [ -d "$COMMANDS_SRC" ]; then
  for cmd_file in "$COMMANDS_SRC"/*.md; do
    cmd_name=$(basename "$cmd_file")
    if [ ! -f "$COMMANDS_DST/$cmd_name" ]; then
      cp "$cmd_file" "$COMMANDS_DST/$cmd_name"
    else
      info "  $cmd_name already exists, skipping (use --force to overwrite)"
    fi
  done
  ok "Commands installed: $(ls "$COMMANDS_SRC"/*.md 2>/dev/null | xargs -I{} basename {} | tr '\n' ' ')"
else
  warn "No commands found in claude-config/commands/"
fi

# ── 5e: Install Skills ──
info "Installing skills..."

SKILLS_SRC="$REPO_DIR/claude-config/skills"
SKILLS_DST="$CLAUDE_DIR/skills"
mkdir -p "$SKILLS_DST"

if [ -d "$SKILLS_SRC" ]; then
  INSTALLED_SKILLS=""
  for skill_dir in "$SKILLS_SRC"/*/; do
    skill_name=$(basename "$skill_dir")
    if [ ! -d "$SKILLS_DST/$skill_name" ]; then
      cp -r "$skill_dir" "$SKILLS_DST/$skill_name"
      INSTALLED_SKILLS="$INSTALLED_SKILLS $skill_name"
    else
      info "  $skill_name already exists, skipping"
    fi
  done
  ok "Skills installed:$INSTALLED_SKILLS"
else
  warn "No skills found in claude-config/skills/"
fi

# ── 5f: Copy example agents.json ──
if [ ! -f "$REPO_DIR/agents.json" ]; then
  cp "$REPO_DIR/agents.json.example" "$REPO_DIR/agents.json"
  ok "agents.json created from example — edit it to register your agents"
else
  ok "agents.json already exists"
fi

# ── Summary ─────────────────────────────────────────────
step "Setup Complete!"

echo -e "
${GREEN}Agentic Me is ready!${NC}

${CYAN}Start the system:${NC}
  cd $REPO_DIR
  ./start.sh

${CYAN}Access:${NC}
  Dashboard:    http://localhost:3000
  Pixel Office: http://localhost:3000/pixel-office
  Server API:   http://localhost:4000/api

${CYAN}Next steps:${NC}
  1. Edit ${YELLOW}agents.json${NC} to register your agents
  2. Create agent workspaces with CLAUDE.md in each
  3. Start a Claude Code session — memcp will auto-load memories

${CYAN}Installed components:${NC}
  ✓ Central Command (server + dashboard)
  ✓ memcp (persistent memory MCP server)
  ✓ OpenSpec (change management workflow)
  ✓ Hooks (session start, pre-compact, stop, progress)
  ✓ MCP servers (memcp + central-command)
  ✓ Commands (/done, /kickoff, /progress, /standup, /night-shift, etc.)
  ✓ Skills (memcp, debug, verification, brainstorming, etc.)
"
