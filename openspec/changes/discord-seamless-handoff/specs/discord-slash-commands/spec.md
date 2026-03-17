## ADDED Requirements

### Requirement: Discord slash commands are registered on bot startup
The slash command bot SHALL register Application Commands with Discord on startup, making them available in the guild's slash command menu.

#### Scenario: Bot registers commands on startup
- **WHEN** the slash command bot starts and connects to Discord gateway
- **THEN** it registers the following slash commands in the configured guild:
  - `/progress [project]` — 查看專案進度
  - `/done [summary]` — 回報工作完成
  - `/propose [name] [description]` — 提出新的變更提案
  - `/apply [change-name]` — 開始實作變更
  - `/overview` — 所有專案總覽

#### Scenario: Commands appear in Discord autocomplete
- **WHEN** a user types `/` in a guild text channel
- **THEN** the registered commands appear in Discord's autocomplete menu with descriptions in 繁體中文

### Requirement: /progress returns project status directly
The `/progress` command SHALL query Central Command API and respond with an Embed showing the project's current status.

#### Scenario: Query specific project progress
- **WHEN** user executes `/progress project:macs-coder`
- **THEN** the bot calls `GET /api/progress?project=macs-coder` and `GET /api/tasks?project=macs-coder&limit=3`
- **AND** responds with an Embed containing: progress items with status/percentage, last 3 tasks, and last activity time

#### Scenario: Query progress without specifying project
- **WHEN** user executes `/progress` without the project option in channel `#macs-coder`
- **THEN** the bot infers the project from channel-to-project mapping and responds as above

#### Scenario: No matching project
- **WHEN** user executes `/progress project:unknown`
- **THEN** the bot responds with an ephemeral error message "找不到專案 'unknown'"

### Requirement: /overview returns all-project summary
The `/overview` command SHALL query Central Command API and respond with a summary of all active projects.

#### Scenario: User requests overview
- **WHEN** user executes `/overview`
- **THEN** the bot calls `GET /api/projects` and responds with an Embed listing each project's name, status, and latest task summary

### Requirement: /done forwards to Claude Code via cc-connect
The `/done` command SHALL forward the request to Claude Code by posting a formatted message in the channel.

#### Scenario: User completes work session
- **WHEN** user executes `/done summary:完成了 API 設計`
- **THEN** the bot responds with an ephemeral message "已轉發給 Claude Code 處理中..."
- **AND** posts a message in the channel: `[SLASH] /done 完成了 API 設計`
- **AND** cc-connect picks up the message and forwards it to Claude Code

#### Scenario: /done without summary
- **WHEN** user executes `/done` without the summary option
- **THEN** the bot posts `[SLASH] /done` in the channel (Claude Code will handle the interactive flow)

### Requirement: /propose forwards to Claude Code via cc-connect
The `/propose` command SHALL forward the request to Claude Code for OpenSpec change creation.

#### Scenario: User proposes a change
- **WHEN** user executes `/propose name:add-caching description:加入 Redis 快取層`
- **THEN** the bot responds with an ephemeral message "已轉發給 Claude Code 處理中..."
- **AND** posts: `[SLASH] /opsx:propose add-caching 加入 Redis 快取層`

### Requirement: /apply forwards to Claude Code via cc-connect
The `/apply` command SHALL forward the request to Claude Code for OpenSpec change implementation.

#### Scenario: User applies a change
- **WHEN** user executes `/apply change:discord-seamless-handoff`
- **THEN** the bot responds with an ephemeral message "已轉發給 Claude Code 處理中..."
- **AND** posts: `[SLASH] /opsx:apply discord-seamless-handoff`

### Requirement: Channel-to-project mapping
The slash command bot SHALL maintain a mapping from Discord channel IDs to project names, consistent with the mapping in CLAUDE.md.

#### Scenario: Mapping is loaded from configuration
- **WHEN** the bot starts
- **THEN** it loads the channel-to-project mapping from a config file (`server/src/discord-bot/channel-map.json`)
- **AND** uses this mapping to infer project context for commands executed without explicit project options

### Requirement: Slash bot does not interfere with cc-connect
The slash command bot SHALL only handle interaction events and MUST NOT listen to or respond to regular messages.

#### Scenario: Regular message sent in channel
- **WHEN** a user sends a regular text message in a channel
- **THEN** the slash bot ignores it completely (only cc-connect responds)

#### Scenario: Slash bot's forwarded message
- **WHEN** the slash bot posts a `[SLASH]` prefixed message in the channel
- **THEN** cc-connect receives it and forwards to Claude Code as a prompt
