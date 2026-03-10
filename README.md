# Agentic Me

A personal AI agent system built on [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Transform your Claude Code CLI into a multi-agent productivity system with persistent memory, expert modes, project tracking, and autonomous background execution.

## Features

**Central Command** — Dashboard + REST API for managing agents, tasks, and projects
- Real-time agent activity tracking
- Project progress dashboard
- Task history and analytics
- WebSocket-based live updates

**Expert Modes** — Switch between 9 specialized AI personas with `/switch`
- AI Engineer, Researcher, Full-stack Developer, Presentation Expert, Debug Expert, Code Reviewer, Data Analyst, Paper Writer, UI/UX Designer

**Memory System** — Persistent cross-session knowledge powered by [memcp](https://github.com/maydali28/memcp)
- Graph-based memory storage with BM25 + semantic search
- Automatic knowledge extraction before context compression
- Progressive memory reminders during long sessions
- Scoped memories: global (cross-project) and project-specific

**Night Shift** — Autonomous background task execution
- Launch long-running tasks in tmux sessions
- Circuit breaker: auto-stops after consecutive failures
- Dashboard monitoring and control

**Slash Commands** — 9 productivity commands

| Command | Description |
|---------|-------------|
| `/kickoff` | Create a new project (folder + CLAUDE.md + register) |
| `/switch <expert>` | Switch expert mode with auto wrap-up |
| `/progress` | View and update project progress |
| `/done` | End session with progress report + knowledge extraction |
| `/review` | Daily/weekly work review |
| `/overview` | All projects progress overview |
| `/standup` | Daily standup: yesterday + today plan |
| `/night-shift` | Launch autonomous background task |
| `/night-report` | Review night shift results |

**13 Subagents** — Dispatch specialized agents for independent tasks
- AI Engineer, Debugger, Code Reviewer, Research Analyst, Project Manager, Python Pro, Scientific Researcher, PPT Agent, Technical Writer, Quality Checker, Refactoring Specialist, Progress Reviewer, Web Search Agent

## Quick Start

### Prerequisites

- **Node.js** 20+ (18 minimum)
- **Python** 3.10+
- **Claude Code CLI** ([install guide](https://docs.anthropic.com/en/docs/claude-code))

### Installation

```bash
git clone https://github.com/user/agentic-me.git
cd agentic-me
bash scripts/setup.sh
```

The setup script will:
1. Install npm dependencies and build the server
2. Create a Python venv and install memcp
3. Copy slash commands, expert modes, agents, and hooks to `~/.claude/`
4. Register MCP servers (Central Command + memcp)
5. Configure hooks in Claude Code settings

### Start Central Command

```bash
bash start.sh
```

- Dashboard: http://localhost:3000
- API: http://localhost:4000

Central Command runs inside a tmux session named `cc`. Attach with `tmux attach -t cc` to view logs.

### Verify Installation

Open a new Claude Code session. You should see:
- Memory injection on startup (if you have saved memories)
- `/overview` command works
- `/switch ai-engineer` loads the expert mode
- memcp tools available (`memcp_ping`)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Claude Code CLI                    │
│                                                       │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────┐ │
│  │Commands │  │ Experts  │  │ Agents │  │ Hooks  │ │
│  │  9 .md  │  │  9 .md   │  │ 13 .md │  │  6 .sh │ │
│  └────┬────┘  └────┬─────┘  └───┬────┘  └───┬────┘ │
│       │            │            │            │       │
│  ┌────┴────────────┴────────────┴────────────┴────┐ │
│  │              MCP Servers                        │ │
│  │  ┌──────────────────┐  ┌─────────────────┐     │ │
│  │  │ Central Command  │  │     memcp       │     │ │
│  │  │ (Node.js)        │  │   (Python)      │     │ │
│  │  └────────┬─────────┘  └────────┬────────┘     │ │
│  └───────────┼─────────────────────┼──────────────┘ │
└──────────────┼─────────────────────┼────────────────┘
               │                     │
        ┌──────┴──────┐       ┌──────┴──────┐
        │  SQLite DB  │       │  Graph DB   │
        │  (tasks,    │       │  (memories, │
        │   projects) │       │   contexts) │
        └──────┬──────┘       └─────────────┘
               │
        ┌──────┴──────┐
        │  Dashboard  │
        │  (Next.js)  │
        │  :3000      │
        └─────────────┘
```

## Configuration

### Adding a New Agent

1. Edit `agents.json` — add an entry with `id`, `name`, `role`, `path`
2. The agent appears on the Dashboard automatically

### Adding a New Expert Mode

1. Create `~/.claude/experts/my-expert.md` with the expert's knowledge and instructions
2. Add an entry to the `experts` array in `agents.json`
3. Use `/switch my-expert` to activate

### Customizing Hooks

Hooks are in `~/.claude/hooks/`. Key hooks:

| Hook | Event | Purpose |
|------|-------|---------|
| `memcp-session-start.sh` | SessionStart | Injects memories on session start |
| `memcp-stop.sh` | Stop | Progressive memory reminders |
| `memcp-pre-compact.sh` | PreCompact | Knowledge extraction before compression |
| `memcp-reset-counter.sh` | PostToolUse | Resets session counter after memory save |
| `cc-tool-usage.sh` | PostToolUse | Tracks tool usage to Central Command |
| `cc-progress-stop.sh` | Stop | Reminds to report progress |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CC_PORT` | `4000` | Central Command API port |
| `CC_WS_PORT` | `4001` | WebSocket port |
| `CC_API_URL` | `http://localhost:4000` | API URL (used by hooks) |
| `WORKSPACE_DIR` | `$HOME/workspace` | Where project folders live |
| `MEMCP_DATA_DIR` | `$HOME/.memcp` | memcp data directory |
| `AGENTIC_ME_DIR` | (set by setup) | Repo installation path |
| `AGENTS_CONFIG_PATH` | `./agents.json` | Custom agents.json path |

## Uninstall

```bash
bash scripts/uninstall.sh
```

This removes Claude config files, MCP entries, hooks, and the `AGENTIC_ME_DIR` environment variable from your shell profile. The repo directory is preserved.

## Credits

- **memcp** — Persistent memory MCP server by [maydali28](https://github.com/maydali28/memcp), MIT License
- Built for use with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) by Anthropic

## License

MIT — see [LICENSE](LICENSE)
