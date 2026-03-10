#!/bin/bash
# PostToolUse Hook (memcp): Reset turn counter after memcp_remember/memcp_load_context
INPUT=$(cat)
echo "0" > /tmp/claude_session_turns
