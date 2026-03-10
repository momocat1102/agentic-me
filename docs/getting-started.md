# Getting Started

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18.x | 20.x+ |
| Python | 3.10 | 3.11+ |
| Claude Code CLI | Latest | Latest |
| OS | Linux, macOS, WSL2 | Ubuntu 22.04+ / macOS 14+ |
| RAM | 2 GB | 4 GB+ |

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/user/agentic-me.git
cd agentic-me
```

### 2. Run Setup

```bash
bash scripts/setup.sh
```

The script performs these steps:
1. **Prerequisites check** — verifies Node.js, Python, and Claude Code CLI
2. **npm install** — installs server and dashboard dependencies
3. **Server build** — compiles TypeScript server
4. **memcp install** — creates Python venv, installs memcp package
5. **agents.json** — generates from template with your workspace path
6. **Claude config** — copies commands, experts, agents, hooks to `~/.claude/`
7. **MCP registration** — adds central-command and memcp to `~/.claude/mcp.json`
8. **Hooks setup** — registers all hooks in `~/.claude/settings.json`
9. **Environment** — adds `AGENTIC_ME_DIR` to your shell profile

### 3. Start Central Command

```bash
bash start.sh
```

This launches both the API server (port 4000) and dashboard (port 3000) in a tmux session named `cc`.

### 4. Verify

Open a **new** Claude Code session (important — new session picks up the hooks):

```bash
claude
```

You should see memory injection at startup. Try:
- `/overview` — shows all projects
- `/switch ai-engineer` — loads AI engineer expert mode
- Type "call memcp_ping" to verify memcp is working

## Platform-Specific Notes

### Windows (WSL2)

Agentic Me runs inside WSL2, not native Windows.

```bash
# In WSL2 terminal
git clone https://github.com/user/agentic-me.git ~/agentic-me
cd ~/agentic-me
bash scripts/setup.sh
```

Access the dashboard from your Windows browser at `http://localhost:3000`.

### macOS

```bash
# Install prerequisites
brew install node python3
npm install -g @anthropic-ai/claude-code

# Install Agentic Me
git clone https://github.com/user/agentic-me.git ~/agentic-me
cd ~/agentic-me
bash scripts/setup.sh
```

### Linux

```bash
# Ensure Node.js 20+ and Python 3.10+
# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3 python3-venv

git clone https://github.com/user/agentic-me.git ~/agentic-me
cd ~/agentic-me
bash scripts/setup.sh
```

## Managing Central Command

```bash
# Start (launches tmux session 'cc')
bash start.sh

# Stop (graceful shutdown + port cleanup)
bash stop.sh

# Restart
bash restart.sh

# View logs
tmux attach -t cc
```

## Creating Your First Project

```
/kickoff
```

This interactive command will:
1. Ask for project name and description
2. Create a project folder with CLAUDE.md
3. Register the project in Central Command

## Next Steps

- [Configuration Guide](configuration.md) — customize experts, commands, and hooks
- [Night Shift Guide](night-shift.md) — set up autonomous background execution
