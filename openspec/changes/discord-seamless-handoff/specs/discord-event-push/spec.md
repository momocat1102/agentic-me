## ADDED Requirements

### Requirement: Server pushes task completion to Discord
When a task is recorded via the Central Command API, the system SHALL send a Discord Embed notification to the webhook URL associated with the task's project.

#### Scenario: Task completed with matching webhook
- **WHEN** a task is recorded via `POST /api/tasks` with `project: "macs-coder"`
- **AND** a webhook URL is configured for project `macs-coder`
- **THEN** the system sends a Discord Embed to that webhook with title "Task Completed", project name, task summary, and timestamp

#### Scenario: Task completed without matching webhook
- **WHEN** a task is recorded via `POST /api/tasks` with `project: "demo"`
- **AND** no webhook URL is configured for project `demo`
- **THEN** no Discord notification is sent and no error is raised

### Requirement: Server pushes progress updates to Discord
When a progress item is updated, the system SHALL send a Discord notification to the associated project's webhook.

#### Scenario: Progress milestone reached
- **WHEN** a progress item is updated via `PUT /api/progress/:id` with `status: "completed"`
- **AND** a webhook URL is configured for that progress item's project
- **THEN** the system sends a Discord Embed with title "Progress Updated", the milestone label, new status, and progress percentage

#### Scenario: Minor progress change is throttled
- **WHEN** two progress updates for the same project occur within 5 minutes
- **THEN** only the first notification is sent; the second is silently dropped

### Requirement: Server pushes night shift reports to Discord
When a night shift round is reported, the system SHALL notify the associated project's Discord channel.

#### Scenario: Night shift round completed
- **WHEN** a night shift round is reported via `POST /api/schedules/:id/report-round` with `status: "completed"`
- **AND** a webhook URL is configured for the schedule's project
- **THEN** the system sends a Discord Embed with title "Night Shift Round", round number, status, and summary

### Requirement: Webhook configuration CRUD
The system SHALL provide API endpoints to manage Discord webhook URLs per project.

#### Scenario: Register a webhook for a project
- **WHEN** `POST /api/discord-webhooks` is called with `{ project: "macs-coder", webhookUrl: "https://discord.com/api/webhooks/..." }`
- **THEN** the webhook is stored and future events for `macs-coder` trigger notifications to that URL

#### Scenario: List all configured webhooks
- **WHEN** `GET /api/discord-webhooks` is called
- **THEN** the system returns all configured webhooks with project name and masked URL (last 8 chars visible)

#### Scenario: Delete a webhook
- **WHEN** `DELETE /api/discord-webhooks/:project` is called
- **THEN** the webhook is removed and no future notifications are sent for that project

### Requirement: Notification throttling
The system SHALL throttle notifications to prevent flooding a Discord channel.

#### Scenario: Burst of events within throttle window
- **WHEN** more than 3 notifications for the same project are triggered within 5 minutes
- **THEN** only the first 3 are sent; subsequent ones are dropped until the window resets
