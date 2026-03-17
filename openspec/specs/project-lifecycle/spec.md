## ADDED Requirements

### Requirement: Four-phase project lifecycle
專案生命週期 SHALL 由 4 個明確的階段組成，每個階段對應一個 command：

1. **Kickoff** (`/kickoff`) — 建立專案，一步到位讓專案 ready-to-work
2. **Start** (`/standup`) — 開始工作 session，回顧上次進度，規劃今天方向
3. **Work** — 使用 `/progress` 查看/更新進度，使用 `/opsx:*` 管理 changes
4. **Wrap-up** (`/done`) — 結束 session，記錄完成的工作，提取知識

#### Scenario: User creates and immediately works on a new project
- **WHEN** user runs `/kickoff` and completes project creation
- **THEN** the project folder SHALL contain: CLAUDE.md, openspec/ (initialized), .claude/ (with opsx commands and skills), and be registered in Central Command
- **AND** user can open the project in VS Code and start working without additional setup

#### Scenario: User starts a work session
- **WHEN** user runs `/standup`
- **THEN** system SHALL show all projects overview, yesterday's activity, upcoming deadlines, and active OpenSpec changes
- **AND** user can choose which project to focus on

#### Scenario: User ends a work session
- **WHEN** user runs `/done`
- **THEN** system SHALL log the task, sync OpenSpec tasks, extract knowledge to memcp
- **AND** system SHALL NOT perform review analysis or suggest next steps (that belongs to /standup)

### Requirement: Kickoff produces ready-to-work project
`/kickoff` SHALL produce a fully initialized project with all tooling configured. The user MUST NOT need to run any additional setup commands after kickoff.

#### Scenario: Kickoff creates complete project structure
- **WHEN** user completes the kickoff flow
- **THEN** system SHALL create:
  - Project folder at `/mnt/d/WorkSpace/<project-id>/`
  - `CLAUDE.md` with project context, file conventions, and updated command references
  - `openspec/` via `openspec init --tools claude` (specs + changes directories, .claude/skills, .claude/commands/opsx)
  - `openspec/specs/overview.md` with roadmap from kickoff discussion
  - Central Command registration with milestones
  - Deadlines (if applicable)
  - memcp memory entry

#### Scenario: Generated CLAUDE.md has no stale references
- **WHEN** kickoff generates a project CLAUDE.md
- **THEN** it SHALL NOT reference `/switch`, `/review`, `/overview`, or any removed commands
- **AND** it SHALL reference only the 4 active commands: `/kickoff`, `/standup`, `/progress`, `/done`

### Requirement: Done is pure session wrap-up
`/done` SHALL focus exclusively on recording what happened in this session. It SHALL NOT duplicate review or planning functionality.

#### Scenario: Done performs minimal wrap-up
- **WHEN** user runs `/done`
- **THEN** system SHALL execute exactly these steps in order:
  1. Summarize work done in this session
  2. Sync OpenSpec tasks (check off completed items, suggest archiving)
  3. Log task to Central Command via `report_task_completion`
  4. Preview and confirm progress updates (if milestones advanced)
  5. Extract knowledge to memcp
- **AND** system SHALL NOT suggest next steps or analyze gaps (that is `/standup`'s job)

### Requirement: Remove /review and /overview commands
`/review` and `/overview` SHALL be removed. Their responsibilities SHALL be redistributed.

#### Scenario: Review functionality is covered by other commands
- **WHEN** user needs to review progress across projects
- **THEN** they SHALL use `/standup` (which includes all-project overview and activity summary)
- **OR** dispatch the `progress-reviewer` subagent for deep weekly reviews

#### Scenario: Overview functionality is merged into standup
- **WHEN** user needs a quick status check
- **THEN** `/standup` Step 1 SHALL provide the same all-project overview that `/overview` provided

### Requirement: Two-layer command system
系統 SHALL 明確區分兩層指令，各自職責不重疊：

**Session Commands**（全域，管理「什麼時候做」）：kickoff, standup, progress, done
**OpenSpec Commands**（專案級，管理「做什麼改動」）：opsx:explore, opsx:propose, opsx:apply, opsx:archive

兩層的接合點 SHALL 清楚定義：
- standup 顯示 active changes → 引導使用者進入 OpenSpec 流程
- done 同步 OpenSpec tasks → 記錄到 Central Command
- kickoff 執行 openspec init → 初始化 OpenSpec 環境

#### Scenario: Standup shows active OpenSpec changes
- **WHEN** user runs `/standup` and the project has active changes in `openspec/changes/`
- **THEN** standup SHALL display each active change's name, status, and task completion (e.g., "add-feature: 3/7 tasks")
- **AND** offer "continue change X" as an action option

#### Scenario: Done syncs OpenSpec tasks and suggests archive
- **WHEN** user runs `/done` and has completed tasks in an active change
- **THEN** done SHALL check off completed tasks in `tasks.md`
- **AND** if all tasks in a change are complete, SHALL suggest running `/opsx:archive <name>`

#### Scenario: Work without a formal change
- **WHEN** user does quick fixes, exploration, or one-off tasks without creating a change
- **THEN** `/done` SHALL still log the work via `report_task_completion`
- **AND** the system SHALL NOT require a change for every piece of work

### Requirement: No stale command references
All commands, CLAUDE.md templates, and documentation SHALL NOT reference removed commands (`/switch`, `/review`, `/overview`).

#### Scenario: Standup does not reference /switch
- **WHEN** standup suggests next actions
- **THEN** it SHALL suggest appropriate subagents or skills, not `/switch <expert>`

#### Scenario: Kickoff template does not reference removed commands
- **WHEN** kickoff generates a new project CLAUDE.md
- **THEN** the Work Guidelines section SHALL NOT mention `/switch`, `/review`, or `/overview`
