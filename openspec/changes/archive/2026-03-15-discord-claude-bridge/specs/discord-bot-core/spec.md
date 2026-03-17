## ADDED Requirements

### Requirement: Bot authentication and startup
The Discord Bot SHALL connect to Discord Gateway using a Bot Token stored in environment variable `DISCORD_BOT_TOKEN`. The Bot SHALL log successful connection and be ready to receive messages.

#### Scenario: Successful bot startup
- **WHEN** the bot process starts with a valid `DISCORD_BOT_TOKEN`
- **THEN** the bot connects to Discord Gateway and logs "Discord bot connected as <bot-username>"

#### Scenario: Missing bot token
- **WHEN** the bot process starts without `DISCORD_BOT_TOKEN`
- **THEN** the process exits with error code 1 and logs "DISCORD_BOT_TOKEN is required"

### Requirement: User authorization
The Bot SHALL only respond to messages from Discord User IDs listed in the `DISCORD_ALLOWED_USERS` environment variable (comma-separated). Messages from unauthorized users SHALL be silently ignored.

#### Scenario: Authorized user sends message
- **WHEN** a user with ID in `DISCORD_ALLOWED_USERS` sends a message in the bot's channel
- **THEN** the bot processes the message

#### Scenario: Unauthorized user sends message
- **WHEN** a user with ID NOT in `DISCORD_ALLOWED_USERS` sends a message
- **THEN** the bot ignores the message without any response

### Requirement: Channel restriction
The Bot SHALL only operate in Discord channels listed in `DISCORD_CHANNEL_IDS` environment variable (comma-separated). If not set, the Bot SHALL respond in any channel where it is mentioned or in DMs.

#### Scenario: Message in allowed channel
- **WHEN** an authorized user sends a message in an allowed channel
- **THEN** the bot processes the message

#### Scenario: Message in restricted channel
- **WHEN** an authorized user sends a message in a channel NOT in `DISCORD_CHANNEL_IDS`
- **THEN** the bot ignores the message

### Requirement: Message routing
The Bot SHALL route incoming messages based on prefix:
- `!ask <prompt>` → Claude CLI bridge
- `!status` → CC query (agent status)
- `!tasks [project]` → CC query (task history)
- `!projects` → CC query (project list)
- `!project <name>` → Set active project context
- `!run <prompt>` → Async task runner
- `!cancel` → Cancel running task
- Messages without prefix in an active thread → Continue conversation in that thread's context

#### Scenario: User sends ask command
- **WHEN** authorized user sends "!ask what files are in src/"
- **THEN** the bot routes to Claude CLI bridge with prompt "what files are in src/"

#### Scenario: User sends unknown command
- **WHEN** authorized user sends "!unknown something"
- **THEN** the bot replies with available commands list

### Requirement: Discord message formatting
The Bot SHALL format responses for Discord compatibility:
- Code blocks preserved with triple backticks
- Output exceeding 1900 characters SHALL be split into multiple messages
- Output exceeding 4000 characters SHALL be uploaded as a .txt file attachment
- Markdown headers converted to **bold** text

#### Scenario: Short response
- **WHEN** Claude CLI returns output under 1900 characters
- **THEN** the bot sends it as a single Discord message

#### Scenario: Very long response
- **WHEN** Claude CLI returns output over 4000 characters
- **THEN** the bot uploads the full output as a .txt attachment with a summary message
