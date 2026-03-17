## ADDED Requirements

### Requirement: Usage guide includes complete user journey
agentic-me.md SHALL include the two-layer command system diagram and all four scenarios (A-D) from the streamline-project-lifecycle design.

#### Scenario: User reads the guide and understands the workflow
- **WHEN** a user reads the agentic-me.md usage guide
- **THEN** they SHALL find a clear diagram showing session commands vs OpenSpec commands
- **AND** concrete scenarios showing how to create projects, do daily work, handle cross-session changes, and choose the right command

### Requirement: All projects have OpenSpec initialized
Every project under `/mnt/d/WorkSpace/` that has a CLAUDE.md SHALL have `openspec/` initialized via `openspec init --tools claude`.

#### Scenario: Existing project without OpenSpec gets initialized
- **WHEN** `openspec init --tools claude` is run in a project directory
- **THEN** the project SHALL have `openspec/specs/`, `openspec/changes/`, `.claude/commands/opsx/`, and `.claude/skills/openspec-*/`

### Requirement: All project CLAUDE.md files use updated command references
Every project CLAUDE.md SHALL use the new two-layer Commands format and SHALL NOT reference `/switch`, `/review`, or `/overview`.

#### Scenario: Project CLAUDE.md has correct Commands section
- **WHEN** a project CLAUDE.md is checked
- **THEN** it SHALL have Session Commands (`/standup`, `/progress`, `/done`) and OpenSpec Commands (`/opsx:*`)
- **AND** it SHALL NOT mention `/switch`, `/review`, or `/overview`
