## ADDED Requirements

### Requirement: Logs database table
The system SHALL create a `logs` table in SQLite with columns: `id` (TEXT PRIMARY KEY), `level` (TEXT NOT NULL, one of 'info', 'warn', 'error'), `module` (TEXT NOT NULL), `message` (TEXT NOT NULL), `data` (TEXT, JSON), `timestamp` (TEXT DEFAULT datetime('now')).

#### Scenario: Table creation on startup
- **WHEN** the server starts and initializes the database
- **THEN** the `logs` table SHALL exist with all required columns and an index on `timestamp`

### Requirement: Logger module API
The system SHALL provide a logger module at `server/src/services/logger.ts` exposing three functions: `logger.info(module, message, data?)`, `logger.warn(module, message, data?)`, `logger.error(module, message, data?)`. Each function SHALL insert a row into the `logs` table with the corresponding level.

#### Scenario: Logging an info message
- **WHEN** code calls `logger.info('scheduler', 'Schedule triggered', { scheduleId: '123' })`
- **THEN** a row SHALL be inserted into `logs` with level='info', module='scheduler', message='Schedule triggered', data='{"scheduleId":"123"}'

#### Scenario: Logging an error with no data
- **WHEN** code calls `logger.error('tasks', 'Task execution failed')`
- **THEN** a row SHALL be inserted with level='error', module='tasks', message='Task execution failed', data=NULL

### Requirement: Logs query API
The system SHALL expose `GET /api/logs` returning log entries sorted by timestamp descending. The endpoint SHALL support query parameters: `level` (filter by level), `module` (filter by module), `limit` (default 100, max 500), `before` (ISO timestamp, for pagination).

#### Scenario: Fetch recent logs
- **WHEN** a client sends `GET /api/logs`
- **THEN** the system SHALL return the 100 most recent log entries as JSON array

#### Scenario: Filter by level
- **WHEN** a client sends `GET /api/logs?level=error`
- **THEN** the system SHALL return only log entries with level='error'

#### Scenario: Filter by module
- **WHEN** a client sends `GET /api/logs?module=scheduler`
- **THEN** the system SHALL return only log entries from the 'scheduler' module

#### Scenario: Pagination with before
- **WHEN** a client sends `GET /api/logs?before=2026-03-08T10:00:00Z`
- **THEN** the system SHALL return log entries with timestamp before the specified time

### Requirement: Log deletion API
The system SHALL expose `DELETE /api/logs` with optional query parameter `before` (ISO timestamp). If `before` is provided, only logs older than that timestamp SHALL be deleted. If not provided, all logs SHALL be deleted.

#### Scenario: Delete old logs
- **WHEN** a client sends `DELETE /api/logs?before=2026-03-01T00:00:00Z`
- **THEN** all log entries with timestamp before 2026-03-01 SHALL be deleted

### Requirement: Key operations logging
The server SHALL log the following operations using the logger module:
- Server startup and shutdown (module: 'server')
- API request errors (module: 'api')
- Schedule execution start/complete/fail (module: 'scheduler')
- Task creation and completion (module: 'tasks')
- WebSocket connections (module: 'ws')

#### Scenario: Server startup logging
- **WHEN** the server starts successfully
- **THEN** an info log SHALL be recorded with module='server' and message containing the port number

#### Scenario: Schedule failure logging
- **WHEN** a schedule execution fails
- **THEN** an error log SHALL be recorded with module='scheduler' and data containing the schedule ID and error details
