## ADDED Requirements

### Requirement: Claude CLI invocation
The bridge SHALL invoke Claude Code CLI using `child_process.spawn` with the command: `claude -p "<prompt>" --output-format text --dangerously-skip-permissions`. The working directory SHALL be set to the active project's path.

#### Scenario: Simple prompt execution
- **WHEN** a prompt "list all TypeScript files" is received with active project "system-agent"
- **THEN** the bridge spawns `claude -p "list all TypeScript files" --output-format text --dangerously-skip-permissions` with cwd set to the project's registered path

#### Scenario: No active project
- **WHEN** a prompt is received but no project is set
- **THEN** the bridge returns an error message: "No active project. Use !project <name> to set one."

### Requirement: Execution timeout
The bridge SHALL enforce a configurable timeout (default 300 seconds) on each Claude CLI invocation. When timeout is reached, the child process SHALL be killed with SIGTERM, followed by SIGKILL after 5 seconds if still alive.

#### Scenario: Command completes within timeout
- **WHEN** Claude CLI completes within 300 seconds
- **THEN** the bridge returns the full stdout output

#### Scenario: Command exceeds timeout
- **WHEN** Claude CLI does not complete within 300 seconds
- **THEN** the bridge kills the process and returns "Command timed out after 5 minutes. Use !run for long tasks."

### Requirement: Budget limit
The bridge SHALL pass `--max-budget-usd` flag to Claude CLI. The default budget is $1.00 per invocation. Users can override with `!ask --budget 5 <prompt>`.

#### Scenario: Default budget
- **WHEN** user sends "!ask refactor this function"
- **THEN** the bridge adds `--max-budget-usd 1.00` to the CLI command

#### Scenario: Custom budget
- **WHEN** user sends "!ask --budget 3 implement the full test suite"
- **THEN** the bridge adds `--max-budget-usd 3.00` to the CLI command

### Requirement: Streaming output indication
The bridge SHALL send a "thinking..." reaction (emoji) when Claude CLI starts, and remove it when execution completes. For commands taking over 10 seconds, the bridge SHALL send a progress message every 30 seconds.

#### Scenario: Quick response
- **WHEN** Claude CLI completes in 5 seconds
- **THEN** the bot adds thinking reaction at start and removes it when sending the response

#### Scenario: Long-running response
- **WHEN** Claude CLI is still running after 30 seconds
- **THEN** the bot sends "Still working... (30s elapsed)" in the thread

### Requirement: Concurrent execution limit
The bridge SHALL maintain a queue with max concurrency of 1 (configurable). Additional requests SHALL be queued and the user notified of their position.

#### Scenario: Second request while first is running
- **WHEN** a second !ask command arrives while another is executing
- **THEN** the bot replies "Queued (position #1). Currently running: <summary of active task>"

#### Scenario: Queue becomes available
- **WHEN** the active task completes and there are queued tasks
- **THEN** the next queued task starts automatically and the user is notified
