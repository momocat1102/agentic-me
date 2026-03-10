#!/usr/bin/env python3
"""Hook: PreCompact — force Claude to save context before /compact.

Reads tool input from stdin and outputs a blocking systemMessage
telling Claude to save all important context before compaction.

Usage in .claude/settings.json:
  "PreCompact": [{
    "matcher": "",
    "hooks": [{"type": "command", "command": "python3 hooks/pre_compact_save.py"}]
  }]
"""

from __future__ import annotations

import json
import sys


def main() -> None:
    # Read hook input from stdin (may be empty)
    try:
        _input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, ValueError):
        _input_data = {}

    message = (
        "COMPACT DETECTED — SAVE REQUIRED\n\n"
        "Before continuing, you MUST:\n"
        "1. memcp_remember() — Save each decision, finding, or rule "
        "discovered in this session\n"
        "2. memcp_load_context() — Save a summary of this session's key points "
        "as a named context\n\n"
        "What isn't saved will be LOST after compact.\n"
        "After saving, proceed with compact."
    )

    # Output blocking system message
    output = {"blockExecution": True, "systemMessage": message}
    print(json.dumps(output))


if __name__ == "__main__":
    main()
