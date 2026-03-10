#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "╔══════════════════════════════════════╗"
echo "║      Agentic Me Uninstall            ║"
echo "╚══════════════════════════════════════╝"
echo ""

# List what will be removed
echo "The following will be removed:"
echo ""

echo "  1. Claude config files installed by setup:"
for dir in commands experts agents hooks; do
  if [ -d "$REPO_DIR/claude-config/$dir" ]; then
    cd "$REPO_DIR/claude-config/$dir"
    find . -type f | while read -r file; do
      target="$CLAUDE_DIR/$dir/$file"
      if [ -f "$target" ]; then
        echo "     - $target"
      fi
    done
    cd "$REPO_DIR"
  fi
done

echo "  2. MCP server entries: central-command, memcp"
echo "  3. Hook entries in settings.json"
echo "  4. AGENTIC_ME_DIR from shell profile"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""

# 1. Remove config files that match repo files
for dir in commands experts agents hooks; do
  if [ -d "$REPO_DIR/claude-config/$dir" ]; then
    cd "$REPO_DIR/claude-config/$dir"
    find . -type f | while read -r file; do
      target="$CLAUDE_DIR/$dir/$file"
      if [ -f "$target" ]; then
        rm -f "$target"
      fi
    done
    cd "$REPO_DIR"
  fi
done
echo -e "${GREEN}[OK]${NC} Config files removed"

# 2. Remove MCP entries
if [ -f "$CLAUDE_DIR/mcp.json" ]; then
  node -e "
  const fs = require('fs');
  let config = JSON.parse(fs.readFileSync('$CLAUDE_DIR/mcp.json', 'utf-8'));
  delete config.mcpServers?.['central-command'];
  delete config.mcpServers?.['memcp'];
  fs.writeFileSync('$CLAUDE_DIR/mcp.json', JSON.stringify(config, null, 2) + '\n');
  "
  echo -e "${GREEN}[OK]${NC} MCP entries removed"
fi

# 3. Remove hook entries from settings.json
if [ -f "$CLAUDE_DIR/settings.json" ]; then
  node -e "
  const fs = require('fs');
  let settings = JSON.parse(fs.readFileSync('$CLAUDE_DIR/settings.json', 'utf-8'));
  if (settings.hooks) {
    for (const [event, hooks] of Object.entries(settings.hooks)) {
      settings.hooks[event] = hooks.filter(h =>
        !h.command || !h.command.includes('$CLAUDE_DIR/hooks/')
      );
      if (settings.hooks[event].length === 0) delete settings.hooks[event];
    }
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  }
  fs.writeFileSync('$CLAUDE_DIR/settings.json', JSON.stringify(settings, null, 2) + '\n');
  "
  echo -e "${GREEN}[OK]${NC} Hook entries removed"
fi

# 4. Remove AGENTIC_ME_DIR from shell profile
for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
  if [ -f "$rc" ]; then
    sed -i '/# Agentic Me/d' "$rc"
    sed -i '/AGENTIC_ME_DIR/d' "$rc"
  fi
done
echo -e "${GREEN}[OK]${NC} Environment variable removed"

echo ""
echo "Uninstall complete. The repo directory ($REPO_DIR) was NOT removed."
echo "To fully remove: rm -rf $REPO_DIR"
