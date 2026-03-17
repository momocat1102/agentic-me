[繁體中文](README.zh-TW.md) | English

# Agentic Me — Personal AI Agent Collaboration System

An extension for [Claude Code](https://github.com/anthropics/claude-code) that turns it into a multi-agent collaboration system. Manage, monitor, and coordinate multiple Claude Code agents through a central dashboard with real-time status tracking, task management, and a pixel-art virtual office.

> **Note:** This project currently only supports Claude Code. It is designed as a Claude Code extension ecosystem — leveraging its skills, hooks, MCP servers, and CLI capabilities to orchestrate multiple agents.

<div align="center">
  <img src="docs/pixel-office-preview.png" alt="Pixel Office — AI agents working in a virtual office" width="800" />
  <p><em>Pixel Office — Your AI agents working together in a cozy virtual office</em></p>
</div>

```
 ┌──────────────────────────────────────────┐
 │      Dashboard (Next.js, port 3000)      │
 │  Overview │ Projects │ Tasks │ Memory    │
 │  Pixel Office │ Logs │ Schedules         │
 └──────────────────┬───────────────────────┘
               WebSocket + REST
 ┌──────────────────┴───────────────────────┐
 │    Central Server (Hono, port 4000)      │
 │  SQLite │ memcp │ WS (port 4001)         │
 └──────────────────┬───────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     │              │              │
 ┌───┴────┐  ┌─────┴────┐  ┌─────┴────┐
 │Research│  │  Code    │  │  System  │ ...
 │ Agent  │  │  Agent   │  │  Agent   │
 └────────┘  └──────────┘  └──────────┘
```

---

## Features

- **Pixel Office** — Interactive pixel-art virtual office where each agent is visualized as a cat character, with day/night cycle, furniture editor, particle effects, bug ecosystem, and Picture-in-Picture support
- **Central Dashboard** — Real-time overview of all agents, projects, tasks, deadlines, and system health
- **Multi-Agent Orchestration** — Register and coordinate multiple Claude Code agents, each with its own workspace and capabilities
- **Memory System** — Integrated with [memcp](https://github.com/maydali28/memcp) for persistent memory with knowledge graph visualization

<div align="center">
  <img src="docs/memory-graph-preview.png" alt="Memory Knowledge Graph — visualizing agent memories and their connections" width="800" />
  <p><em>Knowledge Graph — Visualizing agent memories, decisions, and their semantic connections</em></p>
</div>
- **Night Shift** — Automated background task scheduling for long-running agent work
- **Discord Bot** — Remote agent control and notifications via Discord bridge
- **PWA Support** — Install as a desktop app with offline capabilities
- **OpenSpec Workflow** — Structured proposal → design → implementation workflow for changes
- **Structured Logging** — Centralized log viewer with filtering

---

## Quick Start

### Prerequisites

- Node.js >= 22
- Python 3.11+
- Claude Code (`npm install -g @anthropic-ai/claude-code`)
- tmux (for running server & dashboard in background)

### Step 1: Install memcp-pro (Persistent Memory)

> **Install memcp-pro first.** It sets up the MCP server, hooks, and permissions that Agentic Me builds on.

```bash
git clone https://github.com/momocat1102/memcp-pro.git
cd memcp-pro
bash install.sh
```

This installs [memcp](https://github.com/maydali28/memcp) with auto-loading memories, save reminders, knowledge graph, and 27 auto-approved tools. See [memcp-pro](https://github.com/momocat1102/memcp-pro) for details.

### Step 2: Install Agentic Me

```bash
git clone https://github.com/momocat1102/agentic-me.git
cd agentic-me

# Run setup — installs dependencies, hooks, MCP servers
bash scripts/setup.sh

# Start (Server + Dashboard)
./start.sh
```

Or let Claude do it for you:
```bash
cd agentic-me
claude "Run bash scripts/setup.sh to set up the system, then help me configure my agents"
```

### What the Setup Script Does

1. Installs Node.js dependencies & builds the server
2. Installs [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI — structured change management
3. Configures Claude Code hooks:
   - **SessionStart** — Loads recent activity from Central Command
   - **Stop** — Progress reporting reminders
4. Registers MCP server (`~/.claude/mcp.json`): central-command (merged alongside memcp)
5. Sets up tool permissions (`~/.claude/settings.json`)
6. Installs slash commands (`~/.claude/commands/`):
   - `/kickoff` — Create a new project with roadmap
   - `/standup` — Daily standup: review progress, plan work
   - `/progress` — View and update project milestones
   - `/done` — End session: report progress + extract knowledge
   - `/night-shift` — Background task automation
   - `/night-report` — Review night shift results
   - `/init-spec` — Initialize OpenSpec for a project
   - `/opsx:sync` — Sync OpenSpec changes to Dashboard
7. Installs skills (`~/.claude/skills/`):
   - **Quality**: verification-before-completion, verification-loop, debug
   - **Workflow**: subagent-driven-development, strategic-compact, search-first
   - **Planning**: brainstorming, writing-plans, when-stuck, finishing-a-development-branch

### After Setup

- Dashboard: http://localhost:3000
- Pixel Office: http://localhost:3000/pixel-office
- Server API: http://localhost:4000/api
- WebSocket: ws://localhost:4001

---

## Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Overview | `/` | System stats, agent status, project progress, recent tasks |
| Pixel Office | `/pixel-office` | Interactive virtual office with agent characters |
| Projects | `/projects` | Project progress tracking with OpenSpec integration |
| Tasks | `/tasks` | Task history, filterable by agent |
| Memory | `/memory` | Knowledge graph (Sigma.js) + memory browser |
| Logs | `/logs` | Structured log viewer with level/source filtering |
| Deadlines | `/deadlines` | Deadline management with countdown |
| Schedules | `/schedules` | Night Shift schedule management |

---

## Agent Registration

Agents are registered in `agents.json`:

```json
{
  "agents": [
    {
      "id": "research-agent",
      "name": "Research Agent",
      "role": "Deep search and investigation",
      "path": "/path/to/research-agent"
    }
  ]
}
```

See `agents.json.example` for a full example.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Hono + TypeScript |
| Database | better-sqlite3 |
| Dashboard | Next.js + React + Tailwind CSS 4 |
| Graph Visualization | Sigma.js + Graphology |
| Real-time | WebSocket |
| Memory | memcp (MCP Server) |
| Pixel Office | HTML5 Canvas + custom sprite engine |

---

## Project Structure

```
agentic-me/
├── server/                   # Backend (Hono + TypeScript + SQLite)
│   └── src/
│       ├── index.ts          # Entry point
│       ├── routes/           # REST API routes
│       ├── services/         # Business logic
│       └── discord-bot/      # Discord bridge bot
│
├── dashboard/                # Frontend (Next.js + React + Tailwind)
│   └── src/
│       ├── app/              # Pages (overview, pixel-office, projects, etc.)
│       ├── components/       # Reusable UI components
│       └── lib/
│           ├── api.ts        # API client + WebSocket
│           └── pixel-office/ # Pixel Office game engine
│
├── openspec/                 # Change proposals & specs
├── scripts/                  # Utility scripts
├── docs/                     # Documentation
├── agents.json               # Agent registry
└── start.sh                  # Launch script
```

---

## Acknowledgments

This project is built with and inspired by these amazing open-source projects and assets:

### Core Infrastructure
- [Claude Code](https://github.com/anthropics/claude-code) — AI coding agent by Anthropic
- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/sdk) — Protocol for AI tool integration
- [memcp](https://github.com/maydali28/memcp) — Persistent memory system for Claude Code
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) — Structured change management workflow for Claude Code
- [OpenClaw](https://github.com/danleetw/OpenClaw-bot-review) — Visual dashboard for OpenClaw, adapted for Claude Code

### Backend
- [Hono](https://github.com/honojs/hono) — Lightweight web framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Fast SQLite3 driver for Node.js
- [discord.js](https://github.com/discordjs/discord.js) — Discord bot framework

### Frontend
- [Next.js](https://github.com/vercel/next.js) — React framework
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) — Utility-first CSS framework
- [Sigma.js](https://github.com/jacomyal/sigma.js) + [Graphology](https://github.com/graphology/graphology) — Graph visualization
- [Recharts](https://github.com/recharts/recharts) — Chart library for React
- [Three.js](https://github.com/mrdoob/three.js) — 3D visualization

### Skills & Workflow Inspiration
- [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) — Curated collection of Claude Code skills and best practices
- [Superpowers](https://github.com/obra/superpowers) — Claude Code skill library for enhanced workflows

### Skills & Workflow Inspiration
- [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) — Curated collection of Claude Code skills and best practices
- [Superpowers](https://github.com/obra/superpowers) — Claude Code skill library for enhanced workflows

### Pixel Office Assets
- [Neko Cafe Asset Pack](https://hellorumin.itch.io/neko-cafe-asset-pack) by HelloRumin — Tileset, furniture & cat sprites
- [Animated Pixel Kittens](https://last-tick.itch.io/animated-pixel-kittens-cats-32x32) by Last Tick — Pet cat animations

---

## License

MIT
