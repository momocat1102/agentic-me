Initialize OpenSpec structure for an existing project that doesn't have one yet.

## Instructions

1. **Check if openspec/ already exists** in the current working directory.
   - If it does, tell the user and ask if they want to regenerate (will overwrite specs/overview.md).
   - If the current directory is not a project folder (no CLAUDE.md), warn the user.

2. **Read the project's CLAUDE.md** to extract:
   - Project name and goal
   - Current progress checklist (the `- [ ]` / `- [x]` items)
   - Any phase/milestone structure

3. **Create the directory structure**:
```bash
mkdir -p openspec/specs
```

4. **Generate `openspec/project.md`**:
```markdown
# <Project Name> — Project Spec

## Tech Stack
<Extract from CLAUDE.md or infer from project files>

## Main Goals
<Extract from CLAUDE.md>
```

5. **Generate `openspec/AGENTS.md`**:
```markdown
# Agent Working Guidelines

Before starting any task:
1. Read `specs/overview.md` for core requirements
2. Check `changes/` for any relevant proposals in progress
3. Follow the spec — if requirements need to change, create a proposal in `changes/` first

Working conventions:
- This project's CLAUDE.md is the primary guide
- openspec/specs/ = source of truth for requirements
- openspec/changes/<feature>/ = in-progress changes (proposal.md + tasks.md)
```

6. **Generate `openspec/specs/overview.md`** by converting the CLAUDE.md progress checklist into a structured spec:
```markdown
# <Project Name> — Core Requirements

## Goals
- <goal 1>
- <goal 2>

## Phases
### Phase 1: <name>
- [ ] <milestone>
- [ ] <milestone>

### Phase 2: <name>
...
```

7. **Update the project's CLAUDE.md** — if it doesn't already have a "Spec-Driven Guidelines" section, add one after "File Conventions":
```markdown
## Spec-Driven Guidelines
- Core requirements → `openspec/specs/` (read BEFORE starting any task)
- Proposed changes → `openspec/changes/<feature-name>/`
- When requirements change: create proposal in `openspec/changes/` FIRST
- tasks.md checkbox = implementation progress for that feature
```

8. **Report** what was created:
   - openspec/project.md
   - openspec/AGENTS.md
   - openspec/specs/overview.md
   - CLAUDE.md updated (if needed)
