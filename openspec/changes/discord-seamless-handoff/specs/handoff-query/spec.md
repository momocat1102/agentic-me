## ADDED Requirements

### Requirement: User can query recent work from Discord
When the user asks about recent activity in a Discord channel, the bot SHALL fetch and display the project's recent tasks and progress from Central Command.

#### Scenario: User asks "剛才做了什麼"
- **WHEN** the user sends a message like "剛才做了什麼", "最近進度", or "where did I leave off" in a project channel
- **THEN** the bot calls the handoff API and responds with a formatted summary of recent tasks, current progress items, and last activity time

#### Scenario: User asks about specific project from general channel
- **WHEN** the user sends "macs-coder 目前進度是什麼" in the `#一般` channel
- **THEN** the bot identifies the project name, calls the handoff API for that project, and responds with the summary

### Requirement: Cross-project overview from Discord
The user SHALL be able to get an overview of all active projects from Discord.

#### Scenario: User asks for overall status
- **WHEN** the user sends "所有專案進度" or "overview" in any channel
- **THEN** the bot calls `GET /api/projects` and `GET /api/tasks?limit=10` and responds with a summary covering all active projects, their latest task, and progress status

### Requirement: Handoff context is conversational
The bot SHALL present handoff information in a natural, conversational format rather than raw JSON.

#### Scenario: Activity summary is human-readable
- **WHEN** the bot displays a handoff summary
- **THEN** the output uses natural language with bullet points, not JSON or table format
- **AND** includes relative time references (e.g., "2 小時前完成了...")
