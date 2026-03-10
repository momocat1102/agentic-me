# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in MemCP, please report it responsibly:

1. **Do NOT open a public issue** for security vulnerabilities
2. Email the maintainer directly or use GitHub's private vulnerability reporting
3. Include a description of the vulnerability, steps to reproduce, and potential impact
4. Allow reasonable time for a fix before public disclosure

## Security Design

### Local-First Architecture

MemCP stores all data locally on your machine:

- **Data directory**: `~/.memcp/` (configurable via `MEMCP_DATA_DIR`)
- **No cloud services**: No data is sent to external servers by default
- **No telemetry**: No usage tracking or analytics
- **No network calls**: Core functionality requires zero network access

The only exception is when using remote embedding providers (model2vec/fastembed), which may download model files on first use.

### Data Safety

- **Atomic file writes**: All file operations use `tempfile` + `os.replace()` with `fcntl.flock()` to prevent corruption from concurrent writes or crashes
- **SQLite WAL mode**: The graph database uses Write-Ahead Logging for ACID-compliant operations with concurrent read access
- **Input validation**: `safe_name()` validates all context names against `^[\w.-]+$` to prevent path traversal attacks
- **Size limits**: Contexts are capped at 10MB (configurable) to prevent resource exhaustion

### File Permissions

MemCP creates files with default OS permissions. For sensitive environments:

```bash
chmod 700 ~/.memcp
chmod 600 ~/.memcp/graph.db
```

### What MemCP Does NOT Do

- Does not execute arbitrary code from stored content
- Does not expose network endpoints (MCP uses stdio transport)
- Does not store credentials, tokens, or secrets — **secret detection** scans content for API keys, tokens, and credentials before storage and blocks them (configurable via `MEMCP_SECRET_DETECTION`)
- Does not modify files outside of `~/.memcp/` and the project directory
- Does not require elevated privileges

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | Yes       |
| 0.1.x   | Yes       |

## Dependencies

Core dependencies are minimal and well-maintained:

| Package | Purpose | Security Track Record |
|---------|---------|----------------------|
| `mcp` | MCP protocol | Maintained by Anthropic |
| `pydantic` | Data validation | Widely audited, strong security focus |

Optional dependencies are isolated — a vulnerability in `bm25s` does not affect core memory operations.
