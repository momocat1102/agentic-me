## ADDED Requirements

### Requirement: Discord session injects recent project activity
When a Discord bot session starts for a project channel, the CLAUDE.md instructions SHALL direct the bot to fetch and display recent activity from Central Command before responding to the user.

#### Scenario: User sends first message in project channel
- **WHEN** the Discord bot receives the first message in `#macs-coder` channel
- **AND** the bot identifies the channel maps to project `macs-coder`
- **THEN** the bot calls `GET /api/tasks?project=macs-coder&limit=5` and `GET /api/progress?project=macs-coder`
- **AND** includes a brief activity summary in its initial context (not shown to user as a separate message, used as internal context)

#### Scenario: No recent activity for project
- **WHEN** the bot fetches activity for a project with no recent tasks or progress
- **THEN** the bot proceeds normally without injecting activity context

### Requirement: Activity summary API endpoint
The system SHALL provide a consolidated endpoint that returns a project's recent activity summary suitable for context injection.

#### Scenario: Fetch project handoff context
- **WHEN** `GET /api/projects/:id/handoff` is called
- **THEN** the system returns a JSON object containing:
  - `recentTasks`: last 5 completed tasks (summary, timestamp)
  - `activeProgress`: all non-completed progress items (label, status, percentage)
  - `lastActivity`: timestamp of the most recent event for this project
  - `summary`: a one-line text summary suitable for context injection

#### Scenario: Project has no data
- **WHEN** `GET /api/projects/:id/handoff` is called for a project with no tasks or progress
- **THEN** the system returns empty arrays and `summary: "No recent activity"`

### Requirement: CLAUDE.md updated with context injection steps
The workspace CLAUDE.md SHALL include instructions for the Discord bot to fetch and use project context at session start.

#### Scenario: CLAUDE.md contains handoff instructions
- **WHEN** the Discord bot reads `/mnt/d/WorkSpace/CLAUDE.md`
- **THEN** the instructions include a step to call the handoff API and use the result as working context
