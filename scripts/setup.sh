#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

echo "╔══════════════════════════════════════╗"
echo "║        Agentic Me Setup              ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

# ── 1. Prerequisites ──
echo "── Checking prerequisites ──"

command -v node >/dev/null || fail "Node.js is required (v20+ recommended). Install: https://nodejs.org/"
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -ge 18 ] && ok "Node.js $(node -v)" || warn "Node.js $(node -v) — v20+ recommended"

command -v npm >/dev/null || fail "npm is required"
ok "npm $(npm -v)"

command -v python3 >/dev/null || fail "Python 3.10+ is required for memcp"
PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
ok "Python $PYTHON_VER"

if command -v claude >/dev/null; then
  ok "Claude Code CLI found"
else
  warn "Claude Code CLI not found — install it to use slash commands and hooks"
fi

echo ""

# ── 2. Install Central Command ──
echo "── Installing Central Command (npm) ──"
cd "$REPO_DIR"
npm install --silent 2>&1 | tail -1
ok "npm dependencies installed"

if [ -f "$REPO_DIR/server/tsconfig.json" ]; then
  npm run build -w server --silent 2>&1 | tail -1
  ok "Server built"
fi

echo ""

# ── 3. Install memcp ──
echo "── Installing memcp (Python) ──"
cd "$REPO_DIR/memcp"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  ok "Python venv created"
fi
source .venv/bin/activate
pip install -e . --quiet 2>&1 | tail -1
ok "memcp installed"
deactivate
cd "$REPO_DIR"

echo ""

# ── 4. Setup agents.json ──
echo "── Configuring agents.json ──"
if [ ! -f "$REPO_DIR/agents.json" ]; then
  # Replace $WORKSPACE_DIR placeholder with actual path
  WORKSPACE="${WORKSPACE_DIR:-$HOME/workspace}"
  sed "s|\\\$WORKSPACE_DIR|$WORKSPACE|g" "$REPO_DIR/agents.json.example" > "$REPO_DIR/agents.json"
  ok "agents.json created (workspace: $WORKSPACE)"
else
  ok "agents.json already exists, skipping"
fi

echo ""

# ── 5. Install Claude config files ──
echo "── Installing Claude Code config ──"
mkdir -p "$CLAUDE_DIR"

# Copy directories (skip existing files)
for dir in commands experts agents hooks; do
  mkdir -p "$CLAUDE_DIR/$dir"
  if [ -d "$REPO_DIR/claude-config/$dir" ]; then
    count=0
    # Handle nested directories (like agents/web-search-modules/)
    cd "$REPO_DIR/claude-config/$dir"
    find . -type f | while read -r file; do
      target="$CLAUDE_DIR/$dir/$file"
      target_dir=$(dirname "$target")
      mkdir -p "$target_dir"
      if [ ! -f "$target" ]; then
        cp "$REPO_DIR/claude-config/$dir/$file" "$target"
      fi
    done
    cd "$REPO_DIR"
    ok "$dir/ installed"
  fi
done

# Copy CLAUDE.md if not exists
if [ ! -f "$CLAUDE_DIR/CLAUDE.md" ]; then
  cp "$REPO_DIR/claude-config/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
  ok "CLAUDE.md installed"
else
  ok "CLAUDE.md already exists, skipping (see claude-config/CLAUDE.md for reference)"
fi

echo ""

# ── 6. Register MCP servers ──
echo "── Registering MCP servers ──"
MCP_FILE="$CLAUDE_DIR/mcp.json"

# Create mcp.json if not exists
if [ ! -f "$MCP_FILE" ]; then
  echo '{"mcpServers":{}}' > "$MCP_FILE"
fi

# Use node to merge MCP config
node -e "
const fs = require('fs');
const path = require('path');

const mcpFile = '$MCP_FILE';
const repoDir = '$REPO_DIR';

let config = {};
try { config = JSON.parse(fs.readFileSync(mcpFile, 'utf-8')); } catch {}
if (!config.mcpServers) config.mcpServers = {};

// Central Command MCP
if (!config.mcpServers['central-command']) {
  config.mcpServers['central-command'] = {
    command: 'node',
    args: [path.join(repoDir, 'server', 'dist', 'mcp-server.js')]
  };
}

// memcp MCP
if (!config.mcpServers['memcp']) {
  const venvPython = path.join(repoDir, 'memcp', '.venv', 'bin', 'python');
  config.mcpServers['memcp'] = {
    command: fs.existsSync(venvPython) ? venvPython : 'python3',
    args: ['-m', 'memcp']
  };
}

fs.writeFileSync(mcpFile, JSON.stringify(config, null, 2) + '\n');
"
ok "MCP servers registered in mcp.json"

echo ""

# ── 7. Setup hooks in settings.json ──
echo "── Configuring hooks in settings.json ──"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{}' > "$SETTINGS_FILE"
fi

node -e "
const fs = require('fs');
const hooksDir = '$CLAUDE_DIR/hooks';

let settings = {};
try { settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf-8')); } catch {}

if (!settings.hooks) settings.hooks = {};

const hookDefs = [
  { event: 'SessionStart', file: 'memcp-session-start.sh', timeout: 5000 },
  { event: 'PreCompact', file: 'memcp-pre-compact.sh', timeout: 3000 },
  { event: 'Stop', file: 'memcp-stop.sh', timeout: 3000 },
  { event: 'Stop', file: 'cc-progress-stop.sh', timeout: 3000 },
  { event: 'PostToolUse', file: 'cc-tool-usage.sh', timeout: 3000, matchers: ['*'] },
  { event: 'PostToolUse', file: 'memcp-reset-counter.sh', timeout: 3000, matchers: ['memcp_remember', 'memcp_load_context'] }
];

for (const def of hookDefs) {
  if (!settings.hooks[def.event]) settings.hooks[def.event] = [];
  const arr = settings.hooks[def.event];
  const hookPath = hooksDir + '/' + def.file;

  // Check if already registered
  const exists = arr.some(h => h.command && h.command.includes(def.file));
  if (!exists) {
    const entry = { type: 'command', command: 'bash ' + hookPath };
    if (def.timeout) entry.timeout = def.timeout;
    if (def.matchers) entry.matcher = { tool_name: def.matchers.join('|') };
    arr.push(entry);
  }
}

fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2) + '\n');
"
ok "Hooks configured in settings.json"

echo ""

# ── 8. Set environment variable ──
echo "── Setting environment variables ──"
SHELL_RC=""
if [ -f "$HOME/.zshrc" ]; then
  SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
  SHELL_RC="$HOME/.bashrc"
fi

if [ -n "$SHELL_RC" ]; then
  if ! grep -q "AGENTIC_ME_DIR" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# Agentic Me" >> "$SHELL_RC"
    echo "export AGENTIC_ME_DIR=\"$REPO_DIR\"" >> "$SHELL_RC"
    ok "AGENTIC_ME_DIR added to $SHELL_RC"
  else
    ok "AGENTIC_ME_DIR already set in $SHELL_RC"
  fi
else
  warn "Could not find .bashrc or .zshrc. Please add manually:"
  echo "  export AGENTIC_ME_DIR=\"$REPO_DIR\""
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        Setup Complete!               ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Start Central Command:"
echo "    cd $REPO_DIR && bash start.sh"
echo ""
echo "  Dashboard: http://localhost:3000"
echo "  API:       http://localhost:4000"
echo ""
echo "  Open a new Claude Code session to start using Agentic Me!"
echo ""
