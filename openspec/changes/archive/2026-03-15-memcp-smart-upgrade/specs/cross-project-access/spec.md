## ADDED Requirements

### Requirement: Access configuration file
The system SHALL support a JSON configuration file at `~/.memcp/access.json` that defines cross-project memory access rules. Each key SHALL be a project name, and each value SHALL be an array of project names whose memories are accessible from that project. The file SHALL be read on every query to support hot-reload without server restart.

#### Scenario: Config grants cross-project access
- **WHEN** access.json contains `{"master-thesis": ["macs-coder"]}` and a query is made from project "master-thesis"
- **THEN** the search SHALL include memories from projects "master-thesis", "_global", AND "macs-coder"

#### Scenario: Config file missing preserves default behavior
- **WHEN** `~/.memcp/access.json` does not exist
- **THEN** the search SHALL only include memories from the current project and "_global" (existing behavior)

#### Scenario: Wildcard grants access to all projects
- **WHEN** access.json contains `{"master-thesis": ["*"]}`
- **THEN** queries from "master-thesis" SHALL search memories across ALL projects

### Requirement: Unidirectional access
Access grants SHALL be unidirectional. Granting project A access to project B's memories SHALL NOT automatically grant project B access to project A's memories.

#### Scenario: One-way access
- **WHEN** access.json contains `{"master-thesis": ["macs-coder"]}` but no entry for "macs-coder"
- **THEN** queries from "master-thesis" SHALL see "macs-coder" memories, but queries from "macs-coder" SHALL NOT see "master-thesis" memories

### Requirement: Source project annotation
Search results that include cross-project memories SHALL annotate each result with a `source_project` field indicating which project the memory originated from.

#### Scenario: Cross-project result shows source
- **WHEN** a query from "master-thesis" returns a memory from "macs-coder"
- **THEN** the result SHALL include `source_project: "macs-coder"` in its metadata

#### Scenario: Same-project result shows current project
- **WHEN** a query from "master-thesis" returns a memory from "master-thesis"
- **THEN** the result SHALL include `source_project: "master-thesis"`

### Requirement: Access config management tool
The system SHALL provide a MCP tool `memcp_access_config` to view and modify cross-project access rules. The tool SHALL support `action` parameter with values: `view` (show current config), `grant` (add access), `revoke` (remove access).

#### Scenario: View current access config
- **WHEN** `memcp_access_config(action="view")` is called
- **THEN** the system SHALL return the current access.json contents

#### Scenario: Grant cross-project access
- **WHEN** `memcp_access_config(action="grant", project="master-thesis", target="macs-coder")` is called
- **THEN** the system SHALL add "macs-coder" to master-thesis's access list in access.json

#### Scenario: Revoke cross-project access
- **WHEN** `memcp_access_config(action="revoke", project="master-thesis", target="macs-coder")` is called
- **THEN** the system SHALL remove "macs-coder" from master-thesis's access list in access.json
