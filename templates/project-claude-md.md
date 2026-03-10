# Project CLAUDE.md Template

Use this template when creating a new project with `/kickoff`.

---

# {{PROJECT_NAME}}

## Background
{{Brief description of the project goals and context}}

## File Conventions
All file outputs follow these conventions. Auto-create subdirectories on first use:
- Code → `workbase/`
- Papers → `paper/`
- Slides → `ppt/`
- Data → `data/`
- Documentation → `docs/`
- Final outputs → `outputs/`

Don't create work files directly in the project root.

## Current Progress
- [ ] {{Milestone 1}}
- [ ] {{Milestone 2}}
- [ ] {{Milestone 3}}

## Progress Tracking
Call `report_task_completion(project="{{project-id}}", summary="...")` when completing work.
Call `update_progress(project="{{project-id}}", ...)` when updating milestones.
