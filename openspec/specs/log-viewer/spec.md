## ADDED Requirements

### Requirement: Log viewer page
The Dashboard SHALL provide a log viewer page at `/logs` accessible from the main navigation. The navigation item SHALL replace the removed "工具監控" link.

#### Scenario: Navigate to log viewer
- **WHEN** user clicks "系統 Log" in the navigation bar
- **THEN** the browser SHALL navigate to `/logs` and display the log viewer

### Requirement: Log list display
The log viewer SHALL display log entries in a table or list format showing: timestamp, level (with color coding), module, and message. Entries SHALL be sorted by timestamp descending (newest first).

#### Scenario: Display log entries
- **WHEN** the log viewer page loads
- **THEN** the system SHALL fetch and display the most recent log entries from `GET /api/logs`

#### Scenario: Level color coding
- **WHEN** a log entry is displayed
- **THEN** info level SHALL use a neutral/blue color, warn SHALL use yellow/amber, and error SHALL use red

### Requirement: Log filtering
The log viewer SHALL provide filter controls for: level (dropdown: all/info/warn/error) and module (dropdown populated from available modules). Filters SHALL update the displayed logs in real-time.

#### Scenario: Filter by error level
- **WHEN** user selects "error" from the level filter
- **THEN** only error-level logs SHALL be displayed

#### Scenario: Filter by module
- **WHEN** user selects "scheduler" from the module filter
- **THEN** only logs from the scheduler module SHALL be displayed

### Requirement: Log detail expansion
Each log entry SHALL be expandable to show the full `data` JSON payload (if present). Collapsed state shows only timestamp, level, module, and message.

#### Scenario: Expand log with data
- **WHEN** user clicks on a log entry that has data
- **THEN** the entry SHALL expand to show the formatted JSON data

#### Scenario: Log without data
- **WHEN** user clicks on a log entry without data
- **THEN** the entry SHALL expand but show no additional data section

### Requirement: Auto-refresh
The log viewer SHALL auto-refresh every 10 seconds to show new log entries. A visual indicator SHALL show when new logs have arrived.

#### Scenario: New logs appear
- **WHEN** new logs are written to the server while the page is open
- **THEN** the page SHALL display the new entries within 10 seconds without manual refresh
