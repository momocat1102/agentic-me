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

# Python (optional — needed for memcp, installed separately)
if command -v python3 &>/dev/null; then
  ok "Python $(python3 --version | cut -d' ' -f2) (needed for memcp)"
else
  info "Python 3 not found. Install Python 3.11+ if you plan to use memcp."
fi

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

# ── Step 3: memcp (Persistent Memory) ─────────────────
step "Step 3: memcp (Persistent Memory)"

info "memcp is now installed separately."
echo -e "  ${YELLOW}→${NC} Install memcp: ${CYAN}https://github.com/momocat1102/memcp-pro${NC}"
echo -e "  ${YELLOW}→${NC} Run: git clone https://github.com/momocat1102/memcp-pro.git && cd memcp-pro && bash install.sh"
echo ""

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

# Create or merge central-command into existing mcp.json
if [ ! -f "$MCP_CONFIG" ]; then
  echo '{"mcpServers":{}}' > "$MCP_CONFIG"
fi

if command -v jq &>/dev/null; then
  jq --arg cmd "node" --arg args "$REPO_DIR/server/dist/mcp-server.js" \
    '.mcpServers["central-command"] = {"command": $cmd, "args": [$args], "env": {"CC_API_URL": "http://localhost:4000/api"}}' \
    "$MCP_CONFIG" > "$MCP_CONFIG.tmp" && mv "$MCP_CONFIG.tmp" "$MCP_CONFIG"
else
  cat > "$MCP_CONFIG" << EOMCP
{
  "mcpServers": {
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
fi
ok "MCP config → $MCP_CONFIG"

# ── 5b: Hook Scripts ──
info "Installing hook scripts..."

# SessionStart hook (Central Command only — memcp hooks are installed separately via memcp-pro)
cat > "$CLAUDE_DIR/hooks/cc-session-start.sh" << 'EOHOOK'
#!/usr/bin/env bash
INPUT=$(cat)
SOURCE=$(echo "$INPUT" | grep -o '"source":"[^"]*"' | sed 's/"source":"//;s/"//' || echo "startup")
SOURCE="${SOURCE:-startup}"
if [[ "$SOURCE" == "resume" ]]; then exit 0; fi

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
            "command": "bash ~/.claude/hooks/cc-session-start.sh",
            "timeout": 10000
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
            "command": "bash ~/.claude/hooks/cc-progress-stop.sh",
            "timeout": 5000
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
  3. ${YELLOW}Install memcp${NC} for persistent memory:
     git clone https://github.com/momocat1102/memcp-pro.git
     cd memcp-pro && bash install.sh

${CYAN}Installed components:${NC}
  ✓ Central Command (server + dashboard)
  ✓ OpenSpec (change management workflow)
  ✓ Hooks (session start, progress reminder)
  ✓ MCP server (central-command)
  ✓ Commands (/done, /kickoff, /progress, /standup, /night-shift, etc.)
  ✓ Skills (debug, verification, brainstorming, etc.)

${CYAN}Optional:${NC}
  ○ memcp (persistent memory) — install separately from:
    ${CYAN}https://github.com/momocat1102/memcp-pro${NC}
"
