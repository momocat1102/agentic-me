## ADDED Requirements

### Requirement: Agent status query
The `!status` command SHALL query `GET /api/agents` from Central Command and display a formatted summary of all agents with their current status (online/offline/working).

#### Scenario: Query agent status
- **WHEN** user sends "!status"
- **THEN** the bot replies with a formatted list showing each agent's name, status, and last activity time

### Requirement: Task history query
The `!tasks` command SHALL query `GET /api/tasks` from Central Command. It SHALL support an optional project filter.

#### Scenario: Query all tasks
- **WHEN** user sends "!tasks"
- **THEN** the bot replies with the 10 most recent tasks across all projects

#### Scenario: Query tasks by project
- **WHEN** user sends "!tasks macs-paper"
- **THEN** the bot replies with the 10 most recent tasks for the "macs-paper" project

### Requirement: Project list query
The `!projects` command SHALL query `GET /api/projects` from Central Command and display all projects with their status and task counts.

#### Scenario: List projects
- **WHEN** user sends "!projects"
- **THEN** the bot replies with a formatted list of all projects showing name, status (active/paused/completed), and recent task count

### Requirement: Set active project
The `!project <name>` command SHALL set the active project context for subsequent Claude CLI commands. It SHALL validate the project name against registered projects in Central Command.

#### Scenario: Set valid project
- **WHEN** user sends "!project system-agent"
- **THEN** the bot confirms "Active project set to **system-agent** (/mnt/d/WorkSpace/system-agent/)"

#### Scenario: Set invalid project
- **WHEN** user sends "!project nonexistent"
- **THEN** the bot replies "Project 'nonexistent' not found. Use !projects to see available projects."

### Requirement: Quick schedule status
The `!schedules` command SHALL query `GET /api/schedules` and show active/enabled schedules with their last run status.

#### Scenario: Query schedules
- **WHEN** user sends "!schedules"
- **THEN** the bot replies with enabled schedules showing name, next run time, and last run result
