Interactive project creation: create folder, generate CLAUDE.md, register with Central Command.

Follow this flow to interact with the user:

## Step 1: Understand the Project

Discuss with the user:
- What is the ultimate goal of this project?
- Expected timeline? Any hard deadlines?
- What types of work are involved? (research, coding, paper writing, presentations, etc.)
- Project ID (English kebab-case, e.g., macs-paper, annotation-platform)

## Step 2: Plan the Roadmap

Based on the discussion, plan:
- Break the project into 3-6 phases (Phase / Milestone)
- Estimated duration and deliverables for each phase
- Dependencies between phases

Present to the user in a tree structure:
```
Project Name ─── estimated N weeks
├── Phase 1: Literature Survey (weeks 1-2)
│   ├── Collect related papers
│   └── Write Literature Review
├── Phase 2: Implementation & Replication (weeks 3-4)
│   ├── Replicate baseline model
│   └── Build experiment framework
...
```

## Step 3: Confirm and Create

After presenting the full plan, use `AskUserQuestion` to confirm:

```
question: "Confirm creating this project?"
header: "Confirm"
options:
  - label: "Confirm"
    description: "Create folder, CLAUDE.md, and register with Central Command"
  - label: "Adjust plan"
    description: "Modify milestones or timeline before creating"
  - label: "Cancel"
    description: "Abort creation, make no changes"
multiSelect: false
```

After user confirms:

### 3.1 Create Project Folder

Detect the workspace root by taking the parent directory of the current working directory (i.e., the directory that contains the current project). Store it as `WORKSPACE_DIR`.

```bash
WORKSPACE_DIR="$(dirname "$(pwd)")"
PROJECT_DIR="$WORKSPACE_DIR/<project-id>"
mkdir -p "$PROJECT_DIR"
```

Only create the folder and CLAUDE.md. Subdirectories (workbase/, paper/, ppt/, etc.) are created on demand during actual work.

### 3.2 Generate CLAUDE.md

Create CLAUDE.md in the project folder with content based on the discussion:

```markdown
# [Project Name]

## Project Background
- Goal: [one-sentence goal]
- Type: [research paper / software development / presentation / ...]
- Expected timeline: [date]
- Central Command Project ID: [project-id]

## File Conventions
Do not create work files directly in the project root. Create subdirectories as needed:
- Code → `workbase/`
- Papers → `paper/`
- Slides → `ppt/`
- Data → `data/`
- Notes/Literature → `docs/`
- Final outputs → `outputs/`
Create directories on first use.

## Current Progress
- [ ] [milestone 1]
- [ ] [milestone 2]
- [ ] [milestone 3]

## Commands

### Session 管理
- `/standup` — 開始工作，回顧進度，規劃方向
- `/progress` — 查看/更新 milestones
- `/done` — 結束 session，記錄工作

### Change 工作流（OpenSpec）
- `/opsx:explore` — 探索想法，不寫程式
- `/opsx:propose <name>` — 建立 change
- `/opsx:apply <name>` — 實作 change
- `/opsx:archive <name>` — 歸檔完成的 change

Requirements 定義在 `openspec/specs/`，change 管理在 `openspec/changes/`。

## Progress Tracking
Call report_task_completion(project="[project-id]", summary="...") when work is completed.
Call update_progress(project="[project-id]", ...) when milestones advance.
```

### 3.3 Initialize OpenSpec

Run the official OpenSpec CLI to set up the project:

```bash
cd "$PROJECT_DIR" && openspec init --tools claude
```

This automatically creates:
- `openspec/` directory structure
- `.claude/commands/opsx/` — official `/opsx:*` slash commands
- `.claude/skills/` — OpenSpec skills (propose, apply, archive, explore)

Then create `$PROJECT_DIR/openspec/specs/overview.md` with content derived from the Roadmap discussion:
```markdown
# [Project Name] — Core Requirements

## Goals
- [goal extracted from kickoff discussion]

## Phases
### Phase 1: [Phase Name]
- [ ] [Milestone 1]
- [ ] [Milestone 2]

### Phase 2: [Phase Name]
- [ ] [Milestone 3]
- [ ] [Milestone 4]
```

### 3.4 Register with Central Command

```bash
# Create project
curl -s -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"id":"<project-id>","name":"<name>","description":"<description>"}'

# Create progress items (one per milestone)
curl -s -X POST http://localhost:4000/api/progress \
  -H "Content-Type: application/json" \
  -d '{"project":"<project-id>","label":"<milestone name>","category":"milestone","parentId":"<project-id>","sortOrder":<N>}'
```

### 3.5 Register as Agent

Add the new project to `agents.json` so it appears in Pixel Office and activity tracking:

```bash
# Read current agents.json and append new agent entry
# Use jq or manual edit to add:
# {
#   "id": "<project-id>",
#   "name": "<Project Name>",
#   "role": "<one-line role description>",
#   "path": "$PROJECT_DIR"
# }
```

Detect the agentic-me system-agent directory by locating `agents.json` — it lives in the `system-agent` project, which is a sibling of the current project under the same workspace root. Its path is `$WORKSPACE_DIR/system-agent` (where `WORKSPACE_DIR` was determined in Step 3.1).

Edit `$WORKSPACE_DIR/system-agent/agents.json` — add a new entry to the `agents` array with the project info. Then restart the CC server to load the new agent:

```bash
bash "$WORKSPACE_DIR/system-agent/restart.sh"
```

### 3.6 Set Deadlines (if any)

Use MCP tool `manage_deadline` (action: add)

### 3.7 Save to Memory

Use `memcp_remember` to store the project roadmap summary, scope=project, importance=high

## Step 4: Inform the User

Tell the user:
- Project folder created: `$PROJECT_DIR/`
- CLAUDE.md generated
- Registered with Central Command (N milestones)
- Deadlines set (if any)
- The new project is now visible on the Dashboard
- **Next step**: Open `$PROJECT_DIR/` in VS Code and run `/standup` to start working
