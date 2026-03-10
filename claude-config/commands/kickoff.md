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

```bash
PROJECT_DIR="${WORKSPACE_DIR:-$(pwd)}/<project-id>"
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

## Work Guidelines
- Switch expert mode: `/switch <expert>` (ai-engineer, research, paper, web-dev, ppt, debug, code-review, data-analysis, uiux)
- End work session: `/done`
- Check progress: `/progress`
- [Project-specific guidelines]

## Progress Tracking
Call report_task_completion(project="[project-id]", summary="...") when work is completed.
Call update_progress(project="[project-id]", ...) when milestones advance.
```

### 3.3 Register with Central Command

```bash
# Create project
curl -s -X POST "${CC_API_URL:-http://localhost:4000}/api/projects" \
  -H "Content-Type: application/json" \
  -d '{"id":"<project-id>","name":"<name>","description":"<description>"}'

# Create progress items (one per milestone)
curl -s -X POST "${CC_API_URL:-http://localhost:4000}/api/progress" \
  -H "Content-Type: application/json" \
  -d '{"project":"<project-id>","label":"<milestone name>","category":"milestone","parentId":"<project-id>","sortOrder":<N>}'
```

### 3.4 Set Deadlines (if any)

Use MCP tool `manage_deadline` (action: add)

### 3.5 Save to Memory

Use `memcp_remember` to store the project roadmap summary, scope=project, importance=high

## Step 4: Inform the User

Tell the user:
- Project folder created: `$PROJECT_DIR/`
- CLAUDE.md generated
- Registered with Central Command (N milestones)
- Deadlines set (if any)
- The new project is now visible on the Dashboard
- **Next step**: Open `$PROJECT_DIR/` in VS Code and run `/standup` to start working
