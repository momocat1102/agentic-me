# Configuration Guide

## agents.json

The agent registry defines your workspace agents and expert modes.

```json
{
  "agents": [
    {
      "id": "my-agent",
      "name": "My Agent",
      "role": "Description of what this agent does",
      "path": "/home/user/workspace/my-project"
    }
  ],
  "experts": [
    {
      "id": "my-expert",
      "name": "My Expert",
      "description": "What this expert specializes in",
      "icon": "cpu"
    }
  ]
}
```

### Agent Fields
- `id` — unique identifier (used in API calls)
- `name` — display name on dashboard
- `role` — description of capabilities
- `path` — absolute path to the agent's working directory
- `isOrchestrator` — (optional) marks as the central coordinator

### Expert Fields
- `id` — matches the filename in `~/.claude/experts/{id}.md`
- `name` — display name
- `description` — shown in dashboard
- `icon` — Lucide icon name for dashboard display

## Expert Modes

Expert mode files live in `~/.claude/experts/`. Each is a Markdown file that gets injected into Claude's context when you run `/switch <expert-id>`.

### Creating a Custom Expert

Create `~/.claude/experts/my-expert.md`:

```markdown
# My Expert Mode

## Identity
You are an expert in [domain]. You excel at [capabilities].

## Core Competencies
- Skill 1
- Skill 2

## Workflow
1. Step 1
2. Step 2

## Quality Gates
Before completing any task, verify:
- [ ] Check 1
- [ ] Check 2
```

Then add the expert to `agents.json` under `experts` array.

## Slash Commands

Commands live in `~/.claude/commands/`. Each `.md` file becomes a `/command-name` slash command.

### Command Format

Commands are Markdown files with instructions for Claude. They can reference:
- `$ARGUMENTS` — user-provided arguments after the command name
- MCP tools — `report_task_completion`, `update_progress`, etc.
- Other commands — by instructing Claude to run them

### Creating a Custom Command

Create `~/.claude/commands/my-command.md`:

```markdown
You are executing the /my-command command.

Arguments: $ARGUMENTS

## Instructions
1. Do step 1
2. Do step 2
3. Report completion
```

## Subagents

Subagent definitions live in `~/.claude/agents/`. These are dispatched by the main agent for independent tasks using Claude Code's Agent tool.

### Subagent Format

```markdown
---
name: my-agent
description: "When to use this agent"
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

You are a specialized agent for [task type].

When invoked:
1. Understand the task
2. Execute
3. Return results
```

## Hooks

Hooks are shell scripts triggered by Claude Code events. Configured in `~/.claude/settings.json`.

### Hook Events
- `SessionStart` — fires when a new session begins
- `Stop` — fires when Claude stops (between turns)
- `PreCompact` — fires before context compression
- `PostToolUse` — fires after a tool is used

### Customizing Hook Behavior

Edit `~/.claude/settings.json` to add/remove hooks:

```json
{
  "hooks": {
    "Stop": [
      {
        "type": "command",
        "command": "bash ~/.claude/hooks/my-hook.sh",
        "timeout": 3000
      }
    ]
  }
}
```

## MCP Servers

MCP (Model Context Protocol) servers provide tools to Claude. Configured in `~/.claude/mcp.json`.

### Central Command MCP Tools
- `report_task_completion` — record completed tasks
- `update_progress` — update project progress percentage
- `list_projects` — list all registered projects
- `manage_deadline` — set/update project deadlines

### memcp MCP Tools
- `memcp_remember` — store a new memory
- `memcp_recall` — retrieve recent memories
- `memcp_search` — search across memories
- `memcp_forget` — remove a memory
- `memcp_load_context` — store large content blocks
- `memcp_consolidate` — merge similar memories

## Environment Variables

Set in your shell profile (`~/.bashrc` or `~/.zshrc`):

```bash
export AGENTIC_ME_DIR="$HOME/agentic-me"
export WORKSPACE_DIR="$HOME/workspace"
export CC_API_URL="http://localhost:4000"
export MEMCP_DATA_DIR="$HOME/.memcp"
```
