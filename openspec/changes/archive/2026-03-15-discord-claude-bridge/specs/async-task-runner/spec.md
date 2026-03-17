## ADDED Requirements

### Requirement: Async task execution
The `!run <prompt>` command SHALL execute a Claude CLI task in the background. The bot SHALL immediately acknowledge the request and create a Discord thread for progress updates.

#### Scenario: Start async task
- **WHEN** user sends "!run refactor the entire test suite"
- **THEN** the bot creates a thread named "Task: refactor the entire test suite", replies "Task started in background. I'll notify you when it's done.", and begins execution

### Requirement: Task completion notification
When a background task completes, the bot SHALL send the result in the task's thread and mention the user.

#### Scenario: Task completes successfully
- **WHEN** a background Claude CLI task finishes with exit code 0
- **THEN** the bot posts the output in the task thread and sends "@user Task completed!" in the original channel

#### Scenario: Task fails
- **WHEN** a background Claude CLI task finishes with non-zero exit code
- **THEN** the bot posts the error output in the task thread and sends "@user Task failed. Check the thread for details."

### Requirement: Task cancellation
The `!cancel` command SHALL terminate the currently running background task. If no task is running, it SHALL inform the user.

#### Scenario: Cancel running task
- **WHEN** user sends "!cancel" while a background task is running
- **THEN** the bot kills the Claude CLI process and replies "Task cancelled."

#### Scenario: Cancel with no running task
- **WHEN** user sends "!cancel" with no active background task
- **THEN** the bot replies "No task is currently running."

### Requirement: Task budget for async
Async tasks SHALL use a higher default budget of $5.00 (configurable). Users can override with `!run --budget 10 <prompt>`.

#### Scenario: Default async budget
- **WHEN** user sends "!run implement feature X"
- **THEN** the bridge uses `--max-budget-usd 5.00`

#### Scenario: Custom async budget
- **WHEN** user sends "!run --budget 10 full refactor"
- **THEN** the bridge uses `--max-budget-usd 10.00`
